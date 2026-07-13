from flask import Flask, request, jsonify, session
import os
import json
import hashlib
import secrets
import datetime
from functools import wraps

class EmailAuthenticationSystem:
    """
    Email authentication system for the Legal AI Reach Out platform.
    Handles both user authentication and investor access.
    """
    
    def __init__(self, app):
        """Initialize the authentication system with a Flask app."""
        self.app = app
        self.app.secret_key = os.environ.get('SECRET_KEY', secrets.token_hex(16))
        
        # In a real implementation, these would be stored in a database
        # For demonstration purposes, we'll use in-memory storage
        self.users = {}
        self.investors = {}
        self.sessions = {}
        self.reset_tokens = {}
        
        # Load sample data
        self._load_sample_data()
        
        # Register routes
        self._register_routes()
    
    def _load_sample_data(self):
        """Load sample user and investor data."""
        # Sample users
        sample_users = [
            {
                'email': 'user@example.com',
                'password_hash': self._hash_password('password123'),
                'first_name': 'John',
                'last_name': 'Doe',
                'created_at': datetime.datetime.now().isoformat()
            },
            {
                'email': 'user2@example.com',
                'password_hash': self._hash_password('password123'),
                'first_name': 'Jane',
                'last_name': 'Smith',
                'created_at': datetime.datetime.now().isoformat()
            }
        ]
        
        for user in sample_users:
            self.users[user['email']] = user
        
        # Sample investors
        sample_investors = [
            {
                'email': 'investor@example.com',
                'access_level': 2,
                'created_at': datetime.datetime.now().isoformat()
            },
            {
                'email': 'investor2@example.com',
                'access_level': 1,
                'created_at': datetime.datetime.now().isoformat()
            }
        ]
        
        for investor in sample_investors:
            self.investors[investor['email']] = investor
    
    def _register_routes(self):
        """Register authentication routes with the Flask app."""
        # User authentication routes
        @self.app.route('/api/auth/register', methods=['POST'])
        def register():
            data = request.json
            
            # Validate required fields
            required_fields = ['email', 'password', 'first_name', 'last_name']
            for field in required_fields:
                if field not in data:
                    return jsonify({'error': f'Missing required field: {field}'}), 400
            
            email = data['email']
            
            # Check if user already exists
            if email in self.users:
                return jsonify({'error': 'Email already registered'}), 400
            
            # Create new user
            new_user = {
                'email': email,
                'password_hash': self._hash_password(data['password']),
                'first_name': data['first_name'],
                'last_name': data['last_name'],
                'created_at': datetime.datetime.now().isoformat()
            }
            
            self.users[email] = new_user
            
            # Create session
            session_token = self._create_session(email, 'user')
            
            return jsonify({
                'message': 'Registration successful',
                'user': {
                    'email': email,
                    'first_name': new_user['first_name'],
                    'last_name': new_user['last_name']
                },
                'token': session_token
            }), 201
        
        @self.app.route('/api/auth/login', methods=['POST'])
        def login():
            data = request.json
            
            # Validate required fields
            if 'email' not in data or 'password' not in data:
                return jsonify({'error': 'Email and password are required'}), 400
            
            email = data['email']
            password = data['password']
            
            # Check if user exists
            if email not in self.users:
                return jsonify({'error': 'Invalid email or password'}), 401
            
            # Verify password
            user = self.users[email]
            if not self._verify_password(password, user['password_hash']):
                return jsonify({'error': 'Invalid email or password'}), 401
            
            # Create session
            session_token = self._create_session(email, 'user')
            
            # Update last login
            user['last_login'] = datetime.datetime.now().isoformat()
            
            return jsonify({
                'message': 'Login successful',
                'user': {
                    'email': email,
                    'first_name': user['first_name'],
                    'last_name': user['last_name']
                },
                'token': session_token
            }), 200
        
        @self.app.route('/api/auth/logout', methods=['POST'])
        @self._require_auth
        def logout():
            # Get token from Authorization header
            auth_header = request.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                return jsonify({'error': 'Invalid authorization header'}), 401
            
            token = auth_header.split(' ')[1]
            
            # Remove session
            if token in self.sessions:
                del self.sessions[token]
            
            return jsonify({'message': 'Logout successful'}), 200
        
        @self.app.route('/api/auth/reset-password', methods=['POST'])
        def request_reset():
            data = request.json
            
            if 'email' not in data:
                return jsonify({'error': 'Email is required'}), 400
            
            email = data['email']
            
            # Check if user exists
            if email not in self.users:
                # For security reasons, don't reveal that the email doesn't exist
                return jsonify({'message': 'If your email is registered, you will receive a reset link'}), 200
            
            # Generate reset token
            reset_token = secrets.token_urlsafe(32)
            expiry = datetime.datetime.now() + datetime.timedelta(hours=1)
            
            self.reset_tokens[reset_token] = {
                'email': email,
                'expiry': expiry.isoformat()
            }
            
            # In a real implementation, send an email with the reset link
            # For demonstration purposes, we'll just return the token
            return jsonify({
                'message': 'If your email is registered, you will receive a reset link',
                'debug_token': reset_token  # Remove in production
            }), 200
        
        @self.app.route('/api/auth/reset-password/<token>', methods=['POST'])
        def reset_password(token):
            data = request.json
            
            if 'password' not in data:
                return jsonify({'error': 'New password is required'}), 400
            
            # Check if token exists and is valid
            if token not in self.reset_tokens:
                return jsonify({'error': 'Invalid or expired token'}), 400
            
            token_data = self.reset_tokens[token]
            expiry = datetime.datetime.fromisoformat(token_data['expiry'])
            
            if datetime.datetime.now() > expiry:
                del self.reset_tokens[token]
                return jsonify({'error': 'Token has expired'}), 400
            
            # Update password
            email = token_data['email']
            self.users[email]['password_hash'] = self._hash_password(data['password'])
            
            # Remove token
            del self.reset_tokens[token]
            
            return jsonify({'message': 'Password has been reset successfully'}), 200
        
        # Investor authentication routes
        @self.app.route('/api/investor/auth', methods=['POST'])
        def investor_auth():
            data = request.json
            
            if 'email' not in data:
                return jsonify({'error': 'Email is required'}), 400
            
            email = data['email']
            
            # Check if investor exists
            if email not in self.investors:
                return jsonify({'error': 'Email not registered as an investor'}), 401
            
            # Create session
            session_token = self._create_session(email, 'investor')
            
            # Update last login
            investor = self.investors[email]
            investor['last_login'] = datetime.datetime.now().isoformat()
            
            return jsonify({
                'message': 'Investor authentication successful',
                'access_level': investor['access_level'],
                'token': session_token
            }), 200
        
        # Protected routes
        @self.app.route('/api/user/profile', methods=['GET'])
        @self._require_auth
        def get_profile():
            # Get user from session
            user_email = session.get('user_email')
            user = self.users.get(user_email)
            
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            return jsonify({
                'email': user['email'],
                'first_name': user['first_name'],
                'last_name': user['last_name'],
                'created_at': user['created_at'],
                'last_login': user.get('last_login')
            }), 200
        
        @self.app.route('/api/investor/dashboard', methods=['GET'])
        @self._require_investor_auth
        def get_investor_dashboard():
            # Get investor from session
            investor_email = session.get('user_email')
            investor = self.investors.get(investor_email)
            
            if not investor:
                return jsonify({'error': 'Investor not found'}), 404
            
            # In a real implementation, fetch dashboard data from database
            # For demonstration purposes, return sample data
            return jsonify({
                'investor': {
                    'email': investor['email'],
                    'access_level': investor['access_level'],
                    'last_login': investor.get('last_login')
                },
                'metrics': {
                    'response_rate': 42,
                    'case_acceptance': 1.8,
                    'time_to_lawyer': 3.2,
                    'profit_margin': 48
                }
            }), 200
    
    def _hash_password(self, password):
        """Hash a password using SHA-256."""
        return hashlib.sha256(password.encode()).hexdigest()
    
    def _verify_password(self, password, password_hash):
        """Verify a password against a hash."""
        return self._hash_password(password) == password_hash
    
    def _create_session(self, email, user_type):
        """Create a new session for a user or investor."""
        session_token = secrets.token_hex(16)
        expiry = datetime.datetime.now() + datetime.timedelta(days=1)
        
        self.sessions[session_token] = {
            'email': email,
            'type': user_type,
            'expiry': expiry.isoformat()
        }
        
        return session_token
    
    def _require_auth(self, f):
        """Decorator to require authentication for a route."""
        @wraps(f)
        def decorated(*args, **kwargs):
            # Get token from Authorization header
            auth_header = request.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                return jsonify({'error': 'Authentication required'}), 401
            
            token = auth_header.split(' ')[1]
            
            # Check if token exists and is valid
            if token not in self.sessions:
                return jsonify({'error': 'Invalid or expired token'}), 401
            
            session_data = self.sessions[token]
            expiry = datetime.datetime.fromisoformat(session_data['expiry'])
            
            if datetime.datetime.now() > expiry:
                del self.sessions[token]
                return jsonify({'error': 'Session has expired'}), 401
            
            # Set user email in session
            session['user_email'] = session_data['email']
            session['user_type'] = session_data['type']

            # Case routes carry highly sensitive legal material. The application
            # injects a ledger ownership check once its persistent ledger is
            # initialized, so every authenticated case endpoint has one guard.
            case_id = kwargs.get('case_id') or (request.view_args or {}).get('case_id')
            case_access_check = self.app.config.get('LARO_CASE_ACCESS_CHECK')
            if case_id is not None and callable(case_access_check):
                if not case_access_check(case_id, session_data['email']):
                    return jsonify({'error': 'Case not found'}), 404
            
            return f(*args, **kwargs)
        return decorated
    
    def _require_investor_auth(self, f):
        """Decorator to require investor authentication for a route."""
        @wraps(f)
        def decorated(*args, **kwargs):
            # First require authentication
            auth_result = self._require_auth(lambda: None)()
            if isinstance(auth_result, tuple) and auth_result[1] != 200:
                return auth_result
            
            # Then check if user is an investor
            if session.get('user_type') != 'investor':
                return jsonify({'error': 'Investor access required'}), 403
            
            return f(*args, **kwargs)
        return decorated

# Example usage
if __name__ == '__main__':
    app = Flask(__name__)
    auth_system = EmailAuthenticationSystem(app)
    
    @app.route('/')
    def index():
        return 'Authentication System is running!'
    
    app.run(host='0.0.0.0', port=5000, debug=True)
