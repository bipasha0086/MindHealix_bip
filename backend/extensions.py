"""
Shared Flask extensions.
Initialized here to avoid circular imports.
"""

from flask_pymongo import PyMongo
from flask_jwt_extended import JWTManager

# Initialize extensions without app
mongo = PyMongo()
jwt = JWTManager()
