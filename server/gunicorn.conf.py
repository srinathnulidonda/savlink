# server/gunicorn.conf.py

import os
import multiprocessing

_ram_mb = int(os.environ.get('RENDER_RAM_MB', '512'))

if _ram_mb <= 512:
    workers = 1
    threads = 2
elif _ram_mb <= 1024:
    workers = 2
    threads = 2
else:
    workers = min(multiprocessing.cpu_count(), 4)
    threads = 2

workers = int(os.environ.get('WEB_CONCURRENCY', str(workers)))
threads = int(os.environ.get('GUNICORN_THREADS', str(threads)))

worker_class = 'gthread'
timeout = 30
graceful_timeout = 10
keepalive = 5

bind = f"0.0.0.0:{os.environ.get('PORT', '10000')}"

accesslog = '-'
errorlog = '-'
loglevel = os.environ.get('LOG_LEVEL', 'info')

preload_app = False
max_requests = 1000
max_requests_jitter = 100


def on_starting(server):
    server.log.info(
        "Gunicorn starting: %d workers × %d threads = %d concurrent slots",
        workers, threads, workers * threads
    )


def post_fork(server, worker):
    server.log.info("Worker %d spawned (pid: %d)", worker.age, worker.pid)


def worker_exit(server, worker):
    try:
        from app.extensions import db
        db.engine.dispose()
        server.log.info("Worker %d: DB connections disposed", worker.pid)
    except Exception:
        pass


def pre_exec(server):
    server.log.info("Forked child, re-executing")