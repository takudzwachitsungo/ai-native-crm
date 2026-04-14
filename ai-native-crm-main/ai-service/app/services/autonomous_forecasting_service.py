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
import hashlib
import json
import logging
from datetime import datetime
from typing import Any, Dict, List

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

        # Cache structure: {cache_key: {forecast_data, timestamp, pipeline_hash, options}}
        self.forecast_cache: Dict[str, Dict[str, Any]] = {}
        self.snapshot_history: Dict[str, List[Dict[str, Any]]] = {}

        self.last_full_update = None

        self.full_update_interval = 3600
        self.quick_update_interval = 900
        self.cache_ttl = 1800
        self.max_snapshot_history = 12

        logger.info("AutonomousForecastingService initialized")

    async def start(self):
        if self.is_running:
            logger.warning("AutonomousForecastingService already running")
            return

        self.is_running = True
        logger.info("Starting AutonomousForecastingService...")

        self.periodic_task = asyncio.create_task(self._periodic_update_loop())
        self.cache_cleanup_task = asyncio.create_task(self._cache_cleanup_loop())

        logger.info("AutonomousForecastingService started successfully")

    async def stop(self):
        if not self.is_running:
            return

        logger.info("Stopping AutonomousForecastingService...")
        self.is_running = False

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

        logger.info("AutonomousForecastingService stopped")

    async def get_forecast(
        self,
        user_token: str,
        cache_key: str = "default",
        force_refresh: bool = False,
        forecast_months: int = 6,
        forecast_category: str = "COMMIT",
        manager_adjustment_percent: float = 0.0,
        snapshot_label: str | None = None,
    ) -> Dict[str, Any]:
        """
        Get forecast for a tenant/user scope (from cache or generate new).
        """
        if not force_refresh and cache_key in self.forecast_cache:
            cached = self.forecast_cache[cache_key]
            cache_age = (datetime.now() - cached["timestamp"]).total_seconds()

            if cache_age < self.cache_ttl:
                logger.info("Returning cached forecast for key %s (age: %.0fs)", cache_key, cache_age)
                return {
                    **cached["data"],
                    "cached": True,
                    "cache_age_seconds": int(cache_age),
                    "generated_at": cached["timestamp"].isoformat(),
                }

        logger.info("Generating fresh forecast for key %s", cache_key)
        forecast_data = await self._generate_forecast(
            user_token=user_token,
            cache_key=cache_key,
            forecast_months=forecast_months,
            forecast_category=forecast_category,
            manager_adjustment_percent=manager_adjustment_percent,
            snapshot_label=snapshot_label,
        )

        return {
            **forecast_data,
            "cached": False,
            "cache_age_seconds": 0,
            "generated_at": datetime.now().isoformat(),
        }

    async def handle_deal_webhook(
        self,
        deal_id: str,
        event_type: str,
        deal_value: float,
        user_token: str,
        cache_key: str = "default",
    ):
        try:
            logger.info(
                "Deal webhook received: %s - Deal %s ($%0.0f)",
                event_type,
                deal_id,
                deal_value,
            )

            is_significant = await self._is_significant_change(event_type, deal_value, cache_key)

            if is_significant:
                logger.info("Significant pipeline change detected, regenerating forecast for key %s", cache_key)
                cached_options = self.forecast_cache.get(cache_key, {}).get("options", {})
                await self._generate_forecast(
                    user_token=user_token,
                    cache_key=cache_key,
                    forecast_months=cached_options.get("forecast_months", 6),
                    forecast_category=cached_options.get("forecast_category", "COMMIT"),
                    manager_adjustment_percent=cached_options.get("manager_adjustment_percent", 0.0),
                    snapshot_label="Auto refresh",
                )
                await self._check_forecast_alerts(cache_key)
            else:
                logger.info("Change not significant enough to regenerate forecast (threshold: $50K)")

        except Exception as exc:
            logger.error("Error handling deal webhook: %s", str(exc))

    async def _generate_forecast(
        self,
        user_token: str,
        cache_key: str = "default",
        forecast_months: int = 6,
        forecast_category: str = "COMMIT",
        manager_adjustment_percent: float = 0.0,
        snapshot_label: str | None = None,
    ) -> Dict[str, Any]:
        try:
            agent = get_forecasting_agent(
                backend_url=settings.BACKEND_URL,
                api_token=user_token,
            )

            result = await agent.generate_forecast(
                user_token=user_token,
                forecast_months=forecast_months,
            )

            if result.get("success"):
                enriched_result = self._enrich_forecast_result(
                    cache_key=cache_key,
                    forecast_data=result,
                    forecast_category=forecast_category,
                    manager_adjustment_percent=manager_adjustment_percent,
                    snapshot_label=snapshot_label,
                )
                pipeline_hash = self._calculate_pipeline_hash(enriched_result)
                self.forecast_cache[cache_key] = {
                    "data": enriched_result,
                    "timestamp": datetime.now(),
                    "pipeline_hash": pipeline_hash,
                    "options": {
                        "forecast_months": forecast_months,
                        "forecast_category": forecast_category,
                        "manager_adjustment_percent": manager_adjustment_percent,
                    },
                }
                logger.info("Forecast generated and cached for key %s", cache_key)
                return enriched_result

            logger.error("Forecast generation failed: %s", result.get("error"))
            return result

        except Exception as exc:
            logger.error("Error generating forecast: %s", str(exc))
            return {
                "success": False,
                "error": str(exc),
            }

    def _enrich_forecast_result(
        self,
        cache_key: str,
        forecast_data: Dict[str, Any],
        forecast_category: str,
        manager_adjustment_percent: float,
        snapshot_label: str | None,
    ) -> Dict[str, Any]:
        closed_revenue = sum(member.get("closed", 0) for member in forecast_data.get("team_forecasts", []))
        open_pipeline = sum(member.get("pipeline", 0) for member in forecast_data.get("team_forecasts", []))
        weighted_pipeline = float(forecast_data.get("weighted_pipeline", 0) or 0)
        total_quota = float(forecast_data.get("total_quota", 0) or 0)

        base_total = closed_revenue + weighted_pipeline
        commit_value = min(closed_revenue + (open_pipeline * 0.85), base_total * 0.92 if base_total > 0 else 0)
        best_case_value = base_total
        upside_value = min(closed_revenue + open_pipeline, max(best_case_value * 1.12, best_case_value))

        categories = {
            "COMMIT": round(commit_value),
            "BEST_CASE": round(best_case_value),
            "UPSIDE": round(upside_value),
        }

        category_key = forecast_category if forecast_category in categories else "COMMIT"
        selected_base_forecast = float(categories[category_key])
        adjustment_multiplier = 1 + (manager_adjustment_percent / 100)
        final_forecast = round(selected_base_forecast * adjustment_multiplier)

        selected_scale = (final_forecast / best_case_value) if best_case_value > 0 else 1.0
        monthly_forecasts = [
            {
                **month,
                "base_forecast": month.get("forecast", 0),
                "forecast": round((month.get("forecast", 0) or 0) * selected_scale),
            }
            for month in forecast_data.get("monthly_forecasts", [])
        ]
        team_forecasts = [
            {
                **member,
                "base_forecast": member.get("forecast", 0),
                "forecast": round((member.get("forecast", 0) or 0) * selected_scale),
            }
            for member in forecast_data.get("team_forecasts", [])
        ]
        rollup_hierarchy = [
            {
                **node,
                "base_forecast": node.get("forecast", 0),
                "forecast": round((node.get("forecast", 0) or 0) * selected_scale),
            }
            for node in forecast_data.get("rollup_hierarchy", [])
        ]

        category_breakdown = []
        for name, value in categories.items():
            variance_to_quota = round(value - total_quota)
            variance_percent = round(((value - total_quota) / total_quota) * 100, 1) if total_quota > 0 else 0.0
            category_breakdown.append({
                "category": name,
                "forecast": value,
                "variance_to_quota": variance_to_quota,
                "variance_percent": variance_percent,
            })

        history = self.snapshot_history.get(cache_key, [])
        prior_snapshot = history[-1] if history else None
        generated_at = datetime.now().isoformat()
        snapshot_entry = {
            "generated_at": generated_at,
            "snapshot_label": snapshot_label or "Manual refresh",
            "forecast_category": category_key,
            "manager_adjustment_percent": manager_adjustment_percent,
            "base_forecast": round(selected_base_forecast),
            "final_forecast": final_forecast,
            "quota": round(total_quota),
        }
        history.append(snapshot_entry)
        self.snapshot_history[cache_key] = history[-self.max_snapshot_history:]

        variance_to_prior = None
        if prior_snapshot:
            amount_change = final_forecast - prior_snapshot.get("final_forecast", 0)
            percent_change = round((amount_change / prior_snapshot["final_forecast"]) * 100, 1) if prior_snapshot.get("final_forecast") else 0.0
            variance_to_prior = {
                "amount": round(amount_change),
                "percent": percent_change,
                "prior_generated_at": prior_snapshot.get("generated_at"),
                "prior_snapshot_label": prior_snapshot.get("snapshot_label"),
            }

        enriched = {
            **forecast_data,
            "monthly_forecasts": monthly_forecasts,
            "team_forecasts": team_forecasts,
            "rollup_hierarchy": rollup_hierarchy,
            "forecast_categories": category_breakdown,
            "selected_forecast_category": category_key,
            "manager_adjustment_percent": manager_adjustment_percent,
            "base_forecast": round(selected_base_forecast),
            "final_forecast": final_forecast,
            "snapshot_history": self.snapshot_history[cache_key],
            "variance_to_prior": variance_to_prior,
            "closed_revenue": round(closed_revenue),
            "open_pipeline": round(open_pipeline),
            "forecast_vs_quota": round((final_forecast / total_quota) * 100, 1) if total_quota > 0 else 0,
        }
        return enriched

    async def _is_significant_change(
        self,
        event_type: str,
        deal_value: float,
        cache_key: str,
    ) -> bool:
        if event_type in ["closed_won", "closed_lost"]:
            return True

        if deal_value > 50000:
            return True

        if cache_key in self.forecast_cache:
            cache_age = (datetime.now() - self.forecast_cache[cache_key]["timestamp"]).total_seconds()
            if cache_age > 900:
                return True

        return False

    async def _check_forecast_alerts(self, cache_key: str):
        if cache_key not in self.forecast_cache:
            return

        forecast = self.forecast_cache[cache_key]["data"]
        forecast_vs_quota = forecast.get("forecast_vs_quota", 0)

        if forecast_vs_quota < 70:
            logger.warning("ALERT: Forecast at %.0f%% of quota (below 70%%)", forecast_vs_quota)
        elif forecast_vs_quota < 85:
            logger.info("WARNING: Forecast at %.0f%% of quota (below 85%%)", forecast_vs_quota)
        else:
            logger.info("Forecast healthy: %.0f%% of quota", forecast_vs_quota)

    def _calculate_pipeline_hash(self, forecast_data: Dict[str, Any]) -> str:
        hash_data = {
            "weighted_pipeline": forecast_data.get("weighted_pipeline", 0),
            "total_quota": forecast_data.get("total_quota", 0),
            "final_forecast": forecast_data.get("final_forecast", 0),
            "team_count": len(forecast_data.get("team_forecasts", [])),
        }

        hash_str = json.dumps(hash_data, sort_keys=True)
        return hashlib.md5(hash_str.encode()).hexdigest()

    async def _periodic_update_loop(self):
        while self.is_running:
            try:
                await asyncio.sleep(self.full_update_interval)

                if not self.is_running:
                    break

                logger.info("Starting periodic forecast update...")

                if self.forecast_cache:
                    logger.info("Would update forecasts for %s cached scopes", len(self.forecast_cache))
                    logger.info("Periodic updates require service account - not yet implemented")
                else:
                    logger.info("No cached forecasts to update")

                self.last_full_update = datetime.now()

            except asyncio.CancelledError:
                logger.info("Periodic update loop cancelled")
                break
            except Exception as exc:
                logger.error("Error in periodic update loop: %s", str(exc))

    async def _cache_cleanup_loop(self):
        while self.is_running:
            try:
                await asyncio.sleep(1800)

                if not self.is_running:
                    break

                now = datetime.now()
                stale_keys = []

                for cache_key, cached in self.forecast_cache.items():
                    age = (now - cached["timestamp"]).total_seconds()
                    if age > 7200:
                        stale_keys.append(cache_key)

                for key in stale_keys:
                    del self.forecast_cache[key]
                    self.snapshot_history.pop(key, None)

                if stale_keys:
                    logger.debug("Cleaned up %s stale forecast cache entries", len(stale_keys))

            except asyncio.CancelledError:
                logger.info("Cache cleanup loop cancelled")
                break
            except Exception as exc:
                logger.error("Error in cache cleanup loop: %s", str(exc))


autonomous_forecasting = AutonomousForecastingService()
