"""
Autonomous Forecasting Service

This service runs in the background and automatically generates forecasts when:
1. Pipeline data changes significantly (deal created/updated/closed)
2. Periodic intervals (hourly/daily updates)
3. User requests real-time data

Features:
- Cached forecasts for instant UI response
- Smart refresh logic (only regenerate when significant changes detected)
- Proactive alerts on forecast changes
- Historical forecast tracking
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import hashlib
import json

from app.agents.forecasting_agent import get_forecasting_agent
from app.config import settings

logger = logging.getLogger(__name__)


class AutonomousForecastingService:
    """
    Background service for autonomous forecast generation
    
    This service maintains up-to-date forecasts without manual intervention,
    refreshing based on data changes and time intervals.
    """
    
    def __init__(self):
        self.is_running = False
        self.periodic_task = None
        self.cache_cleanup_task = None
        
        # Cache structure: {user_id: {forecast_data, timestamp, pipeline_hash}}
        self.forecast_cache: Dict[str, Dict[str, Any]] = {}
        
        # Track when we last generated forecasts
        self.last_full_update = None
        
        # Configuration
        self.full_update_interval = 3600  # 1 hour for full regeneration
        self.quick_update_interval = 900   # 15 minutes for quick checks
        self.cache_ttl = 1800  # 30 minutes cache validity
        
        logger.info("AutonomousForecastingService initialized")
    
    async def start(self):
        """Start the autonomous forecasting service"""
        if self.is_running:
            logger.warning("AutonomousForecastingService already running")
            return
        
        self.is_running = True
        logger.info("Starting AutonomousForecastingService...")
        
        # Start background tasks
        self.periodic_task = asyncio.create_task(self._periodic_update_loop())
        self.cache_cleanup_task = asyncio.create_task(self._cache_cleanup_loop())
        
        logger.info("✓ AutonomousForecastingService started successfully")
    
    async def stop(self):
        """Stop the autonomous forecasting service"""
        if not self.is_running:
            return
        
        logger.info("Stopping AutonomousForecastingService...")
        self.is_running = False
        
        # Cancel background tasks
        if self.periodic_task:
            self.periodic_task.cancel()
            try:
                await self.periodic_task
            except asyncio.CancelledError:
                pass
        
        if self.cache_cleanup_task:
            self.cache_cleanup_task.cancel()
            try:
                await self.cache_cleanup_task
            except asyncio.CancelledError:
                pass
        
        logger.info("✓ AutonomousForecastingService stopped")
    
    async def get_forecast(
        self, 
        user_token: str, 
        user_id: str = "default",
        force_refresh: bool = False
    ) -> Dict[str, Any]:
        """
        Get forecast for user (from cache or generate new)
        
        Args:
            user_token: JWT token for API calls
            user_id: User identifier for caching
            force_refresh: Skip cache and regenerate
            
        Returns:
            Forecast data with metadata
        """
        # Check cache first (unless force refresh)
        if not force_refresh and user_id in self.forecast_cache:
            cached = self.forecast_cache[user_id]
            cache_age = (datetime.now() - cached["timestamp"]).total_seconds()
            
            if cache_age < self.cache_ttl:
                logger.info(f"Returning cached forecast for user {user_id} (age: {cache_age:.0f}s)")
                return {
                    **cached["data"],
                    "cached": True,
                    "cache_age_seconds": int(cache_age),
                    "generated_at": cached["timestamp"].isoformat()
                }
        
        # Generate new forecast
        logger.info(f"Generating fresh forecast for user {user_id}")
        forecast_data = await self._generate_forecast(user_token, user_id)
        
        return {
            **forecast_data,
            "cached": False,
            "cache_age_seconds": 0,
            "generated_at": datetime.now().isoformat()
        }
    
    async def handle_deal_webhook(
        self, 
        deal_id: str, 
        event_type: str,
        deal_value: float,
        user_token: str,
        user_id: str = "default"
    ):
        """
        Handle deal change webhook and update forecast if significant
        
        Args:
            deal_id: ID of the deal that changed
            event_type: 'created', 'updated', 'closed_won', 'closed_lost'
            deal_value: Value of the deal
            user_token: JWT token for API calls
            user_id: User identifier
        """
        try:
            logger.info(f"📊 Deal webhook received: {event_type} - Deal {deal_id} (${deal_value:,.0f})")
            
            # Check if this is a significant change
            is_significant = await self._is_significant_change(
                event_type, 
                deal_value, 
                user_id
            )
            
            if is_significant:
                logger.info(f"Significant pipeline change detected, regenerating forecast for user {user_id}")
                await self._generate_forecast(user_token, user_id)
                
                # Log alert if forecast changed significantly
                await self._check_forecast_alerts(user_id)
            else:
                logger.info(f"Change not significant enough to regenerate forecast (threshold: $50K)")
        
        except Exception as e:
            logger.error(f"Error handling deal webhook: {str(e)}")
    
    async def _generate_forecast(
        self, 
        user_token: str, 
        user_id: str = "default"
    ) -> Dict[str, Any]:
        """
        Generate new forecast and update cache
        
        Args:
            user_token: JWT token for API calls
            user_id: User identifier for caching
            
        Returns:
            Generated forecast data
        """
        try:
            # Get forecasting agent
            agent = get_forecasting_agent(
                backend_url=settings.BACKEND_URL,
                api_token=user_token
            )
            
            # Generate forecast
            result = await agent.generate_forecast(
                user_token=user_token,
                forecast_months=6
            )
            
            if result.get("success"):
                # Calculate pipeline hash for change detection
                pipeline_hash = self._calculate_pipeline_hash(result)
                
                # Update cache
                self.forecast_cache[user_id] = {
                    "data": result,
                    "timestamp": datetime.now(),
                    "pipeline_hash": pipeline_hash
                }
                
                logger.info(f"✓ Forecast generated and cached for user {user_id}")
            else:
                logger.error(f"Forecast generation failed: {result.get('error')}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error generating forecast: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def _is_significant_change(
        self, 
        event_type: str, 
        deal_value: float,
        user_id: str
    ) -> bool:
        """
        Determine if a deal change is significant enough to regenerate forecast
        
        Args:
            event_type: Type of change
            deal_value: Deal value
            user_id: User identifier
            
        Returns:
            True if significant change
        """
        # Always significant if deal closed
        if event_type in ["closed_won", "closed_lost"]:
            return True
        
        # Significant if high-value deal (>$50K)
        if deal_value > 50000:
            return True
        
        # Check if cache exists and is recent
        if user_id in self.forecast_cache:
            cache_age = (datetime.now() - self.forecast_cache[user_id]["timestamp"]).total_seconds()
            
            # If cache is old (>15 mins), any change is significant
            if cache_age > 900:
                return True
        
        # Otherwise, not significant
        return False
    
    async def _check_forecast_alerts(self, user_id: str):
        """
        Check if forecast changed significantly and log alerts
        
        Args:
            user_id: User identifier
        """
        if user_id not in self.forecast_cache:
            return
        
        forecast = self.forecast_cache[user_id]["data"]
        
        # Check quota attainment
        forecast_vs_quota = forecast.get("forecast_vs_quota", 0)
        
        if forecast_vs_quota < 70:
            logger.warning(f"🚨 ALERT: Forecast at {forecast_vs_quota:.0f}% of quota (below 70%)")
        elif forecast_vs_quota < 85:
            logger.info(f"⚠️  WARNING: Forecast at {forecast_vs_quota:.0f}% of quota (below 85%)")
        else:
            logger.info(f"✓ Forecast healthy: {forecast_vs_quota:.0f}% of quota")
    
    def _calculate_pipeline_hash(self, forecast_data: Dict[str, Any]) -> str:
        """
        Calculate hash of pipeline for change detection
        
        Args:
            forecast_data: Forecast result
            
        Returns:
            Hash string
        """
        # Use weighted pipeline and team forecasts for hash
        hash_data = {
            "weighted_pipeline": forecast_data.get("weighted_pipeline", 0),
            "total_quota": forecast_data.get("total_quota", 0),
            "team_count": len(forecast_data.get("team_forecasts", []))
        }
        
        hash_str = json.dumps(hash_data, sort_keys=True)
        return hashlib.md5(hash_str.encode()).hexdigest()
    
    async def _periodic_update_loop(self):
        """
        Periodic background task to refresh forecasts
        
        Runs every hour to keep forecasts fresh
        """
        while self.is_running:
            try:
                # Wait for the interval
                await asyncio.sleep(self.full_update_interval)
                
                if not self.is_running:
                    break
                
                logger.info("🔄 Starting periodic forecast update...")
                
                # TODO: Update forecasts for all active users
                # This requires service account authentication
                # For now, just log that we would update
                
                if self.forecast_cache:
                    logger.info(f"Would update forecasts for {len(self.forecast_cache)} cached users")
                    logger.info("Periodic updates require service account - not yet implemented")
                else:
                    logger.info("No cached forecasts to update")
                
                self.last_full_update = datetime.now()
                
            except asyncio.CancelledError:
                logger.info("Periodic update loop cancelled")
                break
            except Exception as e:
                logger.error(f"Error in periodic update loop: {str(e)}")
    
    async def _cache_cleanup_loop(self):
        """
        Clean up stale cache entries every 30 minutes
        """
        while self.is_running:
            try:
                # Wait 30 minutes
                await asyncio.sleep(1800)
                
                if not self.is_running:
                    break
                
                # Remove stale entries
                now = datetime.now()
                stale_keys = []
                
                for user_id, cached in self.forecast_cache.items():
                    age = (now - cached["timestamp"]).total_seconds()
                    if age > 7200:  # 2 hours
                        stale_keys.append(user_id)
                
                for key in stale_keys:
                    del self.forecast_cache[key]
                
                if stale_keys:
                    logger.debug(f"Cleaned up {len(stale_keys)} stale forecast cache entries")
                
            except asyncio.CancelledError:
                logger.info("Cache cleanup loop cancelled")
                break
            except Exception as e:
                logger.error(f"Error in cache cleanup loop: {str(e)}")


# Global instance
autonomous_forecasting = AutonomousForecastingService()
