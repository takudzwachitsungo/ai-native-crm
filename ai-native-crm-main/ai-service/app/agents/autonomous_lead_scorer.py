"""
Autonomous Lead Scorer Service

This service runs in the background and automatically scores leads when they are
created or updated via webhooks from the CRM backend. It operates independently
without manual user intervention.

Features:
- Webhook-triggered scoring on lead create/update events
- Cooldown mechanism to prevent duplicate scoring (5 minutes)
- Periodic re-scoring of all leads (hourly)
- Graceful startup and shutdown
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Set

from app.agents.lead_scoring_agent import LeadScoringAgent
from app.config import settings

logger = logging.getLogger(__name__)


class AutonomousLeadScorer:
    """
    Background service for autonomous lead scoring
    
    This service listens for webhook events from the backend and automatically
    scores leads without user intervention. It maintains a cache of recently
    scored leads to prevent duplicate work.
    """
    
    def __init__(self):
        self.is_running = False
        self.background_task = None
        self.scored_leads_cache: Set[str] = set()  # Lead IDs scored in last 5 mins
        self.cache_cleanup_task = None
        logger.info("AutonomousLeadScorer initialized")
    
    async def start(self):
        """Start the autonomous scoring service"""
        if self.is_running:
            logger.warning("AutonomousLeadScorer already running")
            return
        
        self.is_running = True
        logger.info("Starting AutonomousLeadScorer background service...")
        
        # Start background tasks
        self.background_task = asyncio.create_task(self._periodic_scoring_loop())
        self.cache_cleanup_task = asyncio.create_task(self._cache_cleanup_loop())
        
        logger.info("✓ AutonomousLeadScorer started successfully")
    
    async def stop(self):
        """Stop the autonomous scoring service"""
        if not self.is_running:
            return
        
        logger.info("Stopping AutonomousLeadScorer...")
        self.is_running = False
        
        # Cancel background tasks
        if self.background_task:
            self.background_task.cancel()
            try:
                await self.background_task
            except asyncio.CancelledError:
                pass
        
        if self.cache_cleanup_task:
            self.cache_cleanup_task.cancel()
            try:
                await self.cache_cleanup_task
            except asyncio.CancelledError:
                pass
        
        logger.info("✓ AutonomousLeadScorer stopped")
    
    async def score_lead_webhook(self, lead_id: str, user_token: str):
        """
        Score a lead triggered by webhook event
        
        This is called when:
        - A new lead is created (webhook: /webhooks/lead-created)
        - An existing lead is updated (webhook: /webhooks/lead-updated)
        
        Implements cooldown to prevent scoring the same lead multiple times
        within a 5-minute window.
        
        Args:
            lead_id: The ID of the lead to score
            user_token: JWT token for authenticating with the backend
        """
        # Check cooldown - don't re-score if already scored recently
        if lead_id in self.scored_leads_cache:
            logger.info(f"Lead {lead_id} already scored recently, skipping (cooldown)")
            return
        
        try:
            logger.info(f"🤖 Autonomous scoring triggered for lead: {lead_id}")
            
            # Initialize agent with user token
            agent = LeadScoringAgent(
                backend_url=settings.BACKEND_URL,
                api_token=user_token
            )
            
            # Score the lead
            result = await agent.score_lead(lead_id)
            
            # Add to cache to prevent duplicate scoring
            self.scored_leads_cache.add(lead_id)
            
            logger.info(
                f"✓ Lead {lead_id} scored autonomously: "
                f"{result.get('qualification')} ({result.get('score')}/100)"
            )
            
            # Log actions taken
            if result.get('task_created'):
                logger.info(f"  → Task created for lead {lead_id}")
            if result.get('draft_email'):
                logger.info(f"  → Draft email prepared for lead {lead_id}")
        
        except Exception as e:
            logger.error(f"Error in autonomous scoring for lead {lead_id}: {str(e)}")
            # Don't re-raise - webhook should succeed even if scoring fails
    
    async def _periodic_scoring_loop(self):
        """
        Periodic background task to re-score all leads
        
        Runs every hour to keep lead scores fresh as the CRM data changes.
        This ensures that scores reflect the latest company data, deals, and activities.
        
        Note: This requires a service account token or admin credentials.
        Currently a placeholder - needs implementation.
        """
        while self.is_running:
            try:
                # Wait 1 hour between scoring runs
                await asyncio.sleep(3600)
                
                if not self.is_running:
                    break
                
                logger.info("🔄 Starting periodic lead re-scoring...")
                
                # TODO: Implement periodic scoring
                # This requires:
                # 1. Service account authentication (not user token)
                # 2. Fetch all leads from backend
                # 3. Filter leads that haven't been scored recently
                # 4. Score them in batches to avoid overload
                
                logger.info("Periodic scoring not yet implemented (needs service account)")
                
            except asyncio.CancelledError:
                logger.info("Periodic scoring loop cancelled")
                break
            except Exception as e:
                logger.error(f"Error in periodic scoring loop: {str(e)}")
                # Continue running despite errors
    
    async def _cache_cleanup_loop(self):
        """
        Clean up scored leads cache every 5 minutes
        
        This allows leads to be re-scored after the cooldown period.
        """
        while self.is_running:
            try:
                # Wait 5 minutes
                await asyncio.sleep(300)
                
                if not self.is_running:
                    break
                
                # Clear cache
                cleared_count = len(self.scored_leads_cache)
                self.scored_leads_cache.clear()
                
                if cleared_count > 0:
                    logger.debug(f"Cleared {cleared_count} leads from scoring cooldown cache")
                
            except asyncio.CancelledError:
                logger.info("Cache cleanup loop cancelled")
                break
            except Exception as e:
                logger.error(f"Error in cache cleanup loop: {str(e)}")


# Global instance
autonomous_scorer = AutonomousLeadScorer()
