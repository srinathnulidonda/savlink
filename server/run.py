# server/run.py

import os
import logging
from app import create_app

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(name)s %(levelname)s %(message)s',
)
logger = logging.getLogger(__name__)

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 10000))
    debug = app.config.get('DEBUG', False)

    if os.environ.get('FLASK_ENV') == 'production':
        # Production — gunicorn handles this via Procfile
        # This block only runs if someone does `python run.py` directly in prod
        logger.warning(
            "Running Flask dev server in production — "
            "use 'gunicorn -c gunicorn.conf.py run:app' instead"
        )
        app.run(host='0.0.0.0', port=port, debug=False)
    else:
        # Development — Flask dev server with hot reload
        logger.info("Starting dev server on 0.0.0.0:%d", port)
        app.run(host='0.0.0.0', port=port, debug=debug)