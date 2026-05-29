"""
WSGI config for eldplanner project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/wsgi/
"""

import os
from pathlib import Path

from dotenv import load_dotenv
from django.core.wsgi import get_wsgi_application

load_dotenv(Path(__file__).resolve().parent.parent.parent / '.env')

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eldplanner.settings')

application = get_wsgi_application()
