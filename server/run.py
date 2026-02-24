# server/run.py
import os
import logging
from app import create_app

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(name)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 10000))
    logger.info(f"Starting server on 0.0.0.0:{port}")
    app.run(host='0.0.0.0', port=port, debug=app.config['DEBUG'], threaded=True, use_reloader=False)