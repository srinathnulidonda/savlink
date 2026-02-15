# server/app/auth/emergency/email.py
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException
from flask import current_app
from app.utils.base_url import get_base_url

def send_emergency_token_email(email: str, token: str) -> bool:
    config = current_app.config
    
    if not config.get('BREVO_API_KEY'):
        return False
    
    try:
        if config.get('USE_BREVO_API'):
            return send_via_brevo_api(email, token)
        else:
            return send_via_brevo_smtp(email, token)
    except Exception:
        return False

def send_via_brevo_api(email: str, token: str) -> bool:
    try:
        configuration = sib_api_v3_sdk.Configuration()
        configuration.api_key['api-key'] = current_app.config['BREVO_API_KEY']
        
        api_instance = sib_api_v3_sdk.TransactionalEmailsApi(
            sib_api_v3_sdk.ApiClient(configuration)
        )
        
        subject = "Savlink Emergency Access Token"
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2c3e50;">Emergency Access Token</h2>
                <p>Your Savlink emergency access token is:</p>
                <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <code style="font-size: 18px; font-weight: bold; color: #2c3e50;">{token}</code>
                </div>
                <p style="color: #e74c3c;"><strong>This token will expire in 15 minutes.</strong></p>
                <p style="color: #7f8c8d; font-size: 14px;">If you did not request this, please ignore this email.</p>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
Emergency Access Token

Your Savlink emergency access token is: {token}

This token will expire in 15 minutes.

If you did not request this, please ignore this email.
        """
        
        send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
            to=[{"email": email}],
            sender={
                "name": current_app.config['EMAIL_FROM_NAME'],
                "email": current_app.config['EMAIL_FROM_ADDRESS']
            },
            subject=subject,
            html_content=html_content,
            text_content=text_content
        )
        
        api_instance.send_transac_email(send_smtp_email)
        return True
        
    except ApiException:
        return False

def send_via_brevo_smtp(email: str, token: str) -> bool:
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    
    try:
        config = current_app.config
        
        message = MIMEMultipart('alternative')
        message['Subject'] = 'Savlink Emergency Access Token'
        message['From'] = f"{config['EMAIL_FROM_NAME']} <{config['EMAIL_FROM_ADDRESS']}>"
        message['To'] = email
        
        text = f"""
Emergency Access Token

Your Savlink emergency access token is: {token}

This token will expire in 15 minutes.

If you did not request this, please ignore this email.
"""
        
        html = f"""
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2c3e50;">Emergency Access Token</h2>
        <p>Your Savlink emergency access token is:</p>
        <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <code style="font-size: 18px; font-weight: bold; color: #2c3e50;">{token}</code>
        </div>
        <p style="color: #e74c3c;"><strong>This token will expire in 15 minutes.</strong></p>
        <p style="color: #7f8c8d; font-size: 14px;">If you did not request this, please ignore this email.</p>
    </div>
</body>
</html>
"""
        
        message.attach(MIMEText(text, 'plain'))
        message.attach(MIMEText(html, 'html'))
        
        with smtplib.SMTP('smtp-relay.brevo.com', 587) as server:
            starttls()
            login(config['EMAIL_FROM_ADDRESS'], config['BREVO_API_KEY'])
            send_message(message)
        
        return True
    except Exception:
        return False