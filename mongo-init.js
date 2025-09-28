// MongoDB initialization script
db = db.getSiblingDB('ai_interviewer');

// Create collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'password', 'name', 'role'],
      properties: {
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        },
        password: {
          bsonType: 'string',
          minLength: 6
        },
        name: {
          bsonType: 'string',
          minLength: 1
        },
        role: {
          bsonType: 'string',
          enum: ['candidate', 'interviewer', 'admin']
        }
      }
    }
  }
});

db.createCollection('interviews', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['sessionId', 'candidate', 'problem'],
      properties: {
        sessionId: {
          bsonType: 'string'
        },
        candidate: {
          bsonType: 'objectId'
        },
        problem: {
          bsonType: 'object',
          required: ['title', 'description', 'difficulty', 'category'],
          properties: {
            title: { bsonType: 'string' },
            description: { bsonType: 'string' },
            difficulty: { 
              bsonType: 'string',
              enum: ['easy', 'medium', 'hard']
            },
            category: { bsonType: 'string' }
          }
        }
      }
    }
  }
});

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ createdAt: -1 });

db.interviews.createIndex({ sessionId: 1 }, { unique: true });
db.interviews.createIndex({ candidate: 1 });
db.interviews.createIndex({ interviewer: 1 });
db.interviews.createIndex({ status: 1 });
db.interviews.createIndex({ createdAt: -1 });
db.interviews.createIndex({ 'problem.difficulty': 1 });
db.interviews.createIndex({ 'problem.category': 1 });

// Create a default admin user (password: admin123)
db.users.insertOne({
  email: 'admin@ai-interviewer.com',
  password: '$2a$10$rQZ8K9vL8mN7pQrS6tUvOeKjHlM2nB3cD4eF5gH6iJ7kL8mN9oP0qR1sT2uV3wX4yZ5',
  name: 'Admin User',
  role: 'admin',
  profile: {
    experience: 'lead',
    preferredLanguages: ['JavaScript', 'Python', 'Java'],
    timezone: 'UTC'
  },
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

print('Database initialized successfully!');
