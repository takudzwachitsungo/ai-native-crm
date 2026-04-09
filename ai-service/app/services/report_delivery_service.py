from __future__ import annotations

import smtplib
from email.message import EmailMessage
from typing import Dict, Any

from app.config import settings


class ReportDeliveryService:
    def is_configured(self) -> bool:
        return bool(settings.SMTP_HOST and settings.SMTP_FROM_EMAIL)

    def send_report(self, recipient: str, definition_name: str, report: Dict[str, Any]) -> None:
        if not self.is_configured():
            raise RuntimeError("SMTP delivery is not configured for scheduled reports")

        message = EmailMessage()
        message["Subject"] = f"{definition_name} report"
        message["From"] = settings.SMTP_FROM_EMAIL
        message["To"] = recipient
        message.set_content(self._build_plain_text(report))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30) as smtp:
            if settings.SMTP_STARTTLS:
                smtp.starttls()
            if settings.SMTP_USERNAME:
                smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD or "")
            smtp.send_message(message)

    def _build_plain_text(self, report: Dict[str, Any]) -> str:
        insights = "\n".join(f"- {item}" for item in report.get("insights", []))
        recommendations = "\n".join(f"- {item}" for item in report.get("recommendations", []))
        metrics = "\n".join(
            f"- {key}: {value}"
            for key, value in (report.get("metrics") or {}).items()
            if not isinstance(value, dict)
        )

        return (
            f"{report.get('title')}\n\n"
            f"{report.get('summary')}\n\n"
            f"Date range: {report.get('date_range', {}).get('start')} to {report.get('date_range', {}).get('end')}\n\n"
            f"Metrics:\n{metrics or '- No metrics'}\n\n"
            f"Insights:\n{insights or '- No insights'}\n\n"
            f"Recommendations:\n{recommendations or '- No recommendations'}\n"
        )
