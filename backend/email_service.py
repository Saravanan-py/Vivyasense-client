import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from typing import List, Dict, Any, Optional
from config import settings
import logging
from datetime import datetime
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.email_from = settings.EMAIL_FROM
    
    def send_alert_email(self, recipients: List[str], camera_name: str, 
                        violation: Dict[str, Any], image_path: Optional[str] = None):
        """Send alert email with detection details"""
        try:
            # Create message
            msg = MIMEMultipart('related')
            msg['Subject'] = f"🚨 VivyaSense Alert: {violation['violation_type']} Detected"
            msg['From'] = self.email_from
            msg['To'] = ', '.join(recipients)
            
            # Create HTML body
            html_body = self._create_email_html(camera_name, violation)
            msg.attach(MIMEText(html_body, 'html'))
            
            # Attach image if available
            if image_path and os.path.exists(image_path):
                with open(image_path, 'rb') as f:
                    img = MIMEImage(f.read())
                    img.add_header('Content-ID', '<detection_image>')
                    msg.attach(img)
            
            # Send email
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)
            
            logger.info(f"Alert email sent to {recipients}")
            return True
        
        except Exception as e:
            logger.error(f"Failed to send email: {str(e)}")
            return False
    
    def _create_email_html(self, camera_name: str, violation: Dict[str, Any]) -> str:
        """Create HTML email body"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background-color: #f5f5f5;
                    margin: 0;
                    padding: 20px;
                }}
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    background-color: white;
                    border-radius: 10px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    overflow: hidden;
                }}
                .header {{
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 30px;
                    text-align: center;
                }}
                .header h1 {{
                    margin: 0;
                    font-size: 24px;
                }}
                .content {{
                    padding: 30px;
                }}
                .alert-box {{
                    background-color: #fee;
                    border-left: 4px solid #f44;
                    padding: 15px;
                    margin: 20px 0;
                    border-radius: 4px;
                }}
                .info-row {{
                    display: flex;
                    justify-content: space-between;
                    padding: 10px 0;
                    border-bottom: 1px solid #eee;
                }}
                .info-label {{
                    font-weight: bold;
                    color: #555;
                }}
                .info-value {{
                    color: #333;
                }}
                .image-container {{
                    text-align: center;
                    margin: 20px 0;
                }}
                .image-container img {{
                    max-width: 100%;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }}
                .footer {{
                    background-color: #f9f9f9;
                    padding: 20px;
                    text-align: center;
                    color: #777;
                    font-size: 12px;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🚨 VivyaSense Security Alert</h1>
                </div>
                <div class="content">
                    <div class="alert-box">
                        <strong>⚠️ {violation['violation_type']} Detected!</strong>
                    </div>
                    
                    <div class="info-row">
                        <span class="info-label">Camera:</span>
                        <span class="info-value">{camera_name}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Object Detected:</span>
                        <span class="info-value">{violation['object_class'].title()}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Confidence:</span>
                        <span class="info-value">{violation['confidence']:.1%}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Zone:</span>
                        <span class="info-value">{violation.get('roi_name', 'N/A')}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Timestamp:</span>
                        <span class="info-value">{timestamp}</span>
                    </div>
                    
                    <div class="image-container">
                        <img src="cid:detection_image" alt="Detection Image">
                    </div>
                </div>
                <div class="footer">
                    <p>This is an automated alert from VivyaSense AI Video Analytics System</p>
                    <p>© 2024 VivyaSense. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        return html

email_service = EmailService()

