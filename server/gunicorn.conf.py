# server/gunicorn.conf.py

import os
import multiprocessing

cpu_count = multiprocessing.cpu_count()
default_workers = min(4, cpu_count * 2 + 1)
workers = int(os.environ.get('WEB_CONCURRENCY', default_workers))
worker_class = 'gthread'
threads = int(os.environ.get('GUNICORN_THREADS', '4'))

worker_connections = 1000
backlog = 2048

timeout = 30
graceful_timeout = 10
keepalive = 5

max_requests = 1000
max_requests_jitter = 100

bind = f"0.0.0.0:{os.environ.get('PORT', '10000')}"

accesslog = '-'
errorlog = '-'
loglevel = os.environ.get('LOG_LEVEL', 'info')
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s %(D)sμs'

preload_app = True


def on_starting(server):
    server.log.info(
        "Gunicorn starting: %d workers × %d threads = %d concurrent slots",
        workers, threads, workers * threads,
    )


def post_fork(server, worker):
    server.log.info("Worker %s spawned (pid: %s)", worker.age, worker.pid)


def worker_exit(server, worker):
    server.log.info("Worker %s exited (pid: %s)", worker.age, worker.pid)