from celery import Celery

app = Celery(
    "worker",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/0",
    include=['tasks']
)

app.conf.update(
    result_expires=3600,
)

if __name__ == '__main__':
    app.start()
