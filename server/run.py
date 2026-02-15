# server/run.py
import os
import sys
import logging
from app import create_app

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def create_application():
    """Create and configure the Flask application"""
    try:
        logger.info("🚀 Starting Savlink backend...")
        
        # Create the Flask app
        app = create_app()
        
        # Log configuration info
        env = app.config.get('FLASK_ENV', 'production')
        debug = app.config.get('DEBUG', False)
        
        logger.info(f"✅ Application created successfully")
        logger.info(f"📝 Environment: {env}")
        logger.info(f"🔧 Debug mode: {debug}")
        
        return app
        
    except Exception as e:
        logger.error(f"❌ Failed to create application: {e}")
        sys.exit(1)

def main():
    """Main application entry point"""
    # Create the application
    app = create_application()
    
    # Get configuration - CRITICAL FIX FOR RENDER
    port = int(os.environ.get('PORT', 10000))  # Render uses PORT env var
    host = '0.0.0.0'  # Must be 0.0.0.0 for Render
    debug = app.config.get('DEBUG', False)
    env = app.config.get('FLASK_ENV', 'production')
    
    # Production check
    if env == 'production':
        logger.info("🚀 Production mode - using Gunicorn is recommended")
    
    try:
        logger.info(f"🌐 Starting server on http://{host}:{port}")
        logger.info(f"📊 Health check available at: http://{host}:{port}/health")
        
        # CRITICAL: Add immediate health check endpoint binding
        @app.route('/health')
        def health_check_immediate():
            return {'status': 'healthy', 'service': 'savlink-backend'}, 200
        
        @app.route('/ping')
        def ping_immediate():
            return 'pong', 200
        
        # Start the server
        app.run(
            host=host,
            port=port,
            debug=debug,
            threaded=True,
            use_reloader=False
        )
        
    except KeyboardInterrupt:
        logger.info("🛑 Server stopped by user")
    except Exception as e:
        logger.error(f"❌ Server error: {e}")
        sys.exit(1)

# Create app instance for Gunicorn - CRITICAL FIX
def create_app_for_gunicorn():
    """Create app specifically for Gunicorn with immediate routes"""
    app = create_application()
    
    # Add immediate health routes for Render detection
    @app.route('/health')
    def health_immediate():
        return {'status': 'healthy', 'service': 'savlink-backend', 'port': os.environ.get('PORT', '10000')}, 200
    
    @app.route('/ping') 
    def ping_immediate():
        return 'pong', 200
    
    @app.route('/ready')
    def ready_immediate():
        return {'ready': True, 'service': 'savlink-backend'}, 200
    
    return app

# Create app instance for Gunicorn
app = create_app_for_gunicorn()

if __name__ == '__main__':
    main()