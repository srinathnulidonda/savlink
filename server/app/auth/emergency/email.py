# server/app/auth/emergency/email.py
import os
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

FROM_NAME = 'Savlink'
FROM_ADDRESS = os.environ.get('EMAIL_FROM_ADDRESS', 'noreply@savlink.com')
BREVO_API_KEY = os.environ.get('BREVO_API_KEY')


def send_emergency_token_email(email: str, token: str) -> bool:
    if not BREVO_API_KEY:
        logger.warning("BREVO_API_KEY not set — cannot send email")
        return False
    if _send_via_api(email, token):
        return True
    return _send_via_smtp(email, token)


def _build_html(token: str) -> str:
    return (
        '<html><body style="font-family:Arial,sans-serif;line-height:1.6;color:#333">'
        '<div style="max-width:600px;margin:0 auto;padding:20px">'
        '<h2 style="color:#2c3e50">Emergency Access Token</h2>'
        '<p>Your Savlink emergency access token is:</p>'
        '<div style="background:#f4f4f4;padding:15px;border-radius:5px;margin:20px 0">'
        f'<code style="font-size:18px;font-weight:bold;color:#2c3e50">{token}</code>'
        '</div>'
        '<p style="color:#e74c3c"><strong>This token expires in 15 minutes.</strong></p>'
        '<p style="color:#7f8c8d;font-size:14px">If you did not request this, ignore this email.</p>'
        '</div></body></html>'
    )


def _build_text(token: str) -> str:
    return (
        f"Emergency Access Token\n\n"
        f"Your Savlink emergency access token is: {token}\n\n"
        f"This token expires in 15 minutes.\n\n"
        f"If you did not request this, ignore this email."
    )


def _send_via_api(email: str, token: str) -> bool:
    try:
        import sib_api_v3_sdk
        config = sib_api_v3_sdk.Configuration()
        config.api_key['api-key'] = BREVO_API_KEY
        api = sib_api_v3_sdk.TransactionalEmailsApi(sib_api_v3_sdk.ApiClient(config))
        msg = sib_api_v3_sdk.SendSmtpEmail(
            to=[{'email': email}],
            sender={'name': FROM_NAME, 'email': FROM_ADDRESS},
            subject='Savlink Emergency Access Token',
            html_content=_build_html(token),
            text_content=_build_text(token),
        )
        api.send_transac_email(msg)
        return True
    except Exception as e:
        logger.warning("Brevo API send failed: %s", e)
        return False


def _send_via_smtp(email: str, token: str) -> bool:
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = 'Savlink Emergency Access Token'
        msg['From'] = f'{FROM_NAME} <{FROM_ADDRESS}>'
        msg['To'] = email
        msg.attach(MIMEText(_build_text(token), 'plain'))
        msg.attach(MIMEText(_build_html(token), 'html'))
        with smtplib.SMTP('smtp-relay.brevo.com', 587) as server:
            server.starttls()
            server.login(FROM_ADDRESS, BREVO_API_KEY)
            server.send_message(msg)
        return True
    except Exception as e:
        logger.warning("SMTP send failed: %s", e)
        return False