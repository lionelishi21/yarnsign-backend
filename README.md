# YardSign Backend API

A complete backend API for a digital menu board system using Node.js, Express.js, and MongoDB with Mongoose. The system includes real-time functionality using Socket.IO for live updates.

## Features

- **Authentication**: JWT-based authentication with bcrypt password hashing
- **RESTful API**: Complete CRUD operations for all resources
- **Real-time Updates**: Socket.IO integration for live menu and item updates
- **Data Validation**: Express-validator for request validation
- **MongoDB Integration**: Mongoose ODM with proper schema relationships
- **Display Pairing**: Secure pairing system for digital displays
- **File Upload**: Support for menu item images

## Project Structure

```
yardsign-backend/
├── models/           # MongoDB schemas
│   ├── User.js
│   ├── Restaurant.js
│   ├── Item.js
│   ├── Menu.js
│   ├── Display.js
│   └── Schedule.js
├── routes/           # API routes
│   ├── auth.js
│   ├── menus.js
│   ├── items.js
│   ├── displays.js
│   └── restaurants.js
├── middleware/       # Custom middleware
│   ├── auth.js
│   └── validation.js
├── uploads/          # File uploads directory
├── index.js          # Main server file
├── package.json
├── env.example
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Installation

1. **Clone the repository and navigate to the backend directory:**
   ```bash
   cd yardsign-backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp env.example .env
   ```
   
   Edit the `.env` file with your configuration:
   ```env
   MONGODB_URI=mongodb://localhost:27017/yardsign
   JWT_SECRET=your-super-secret-jwt-key-here
   PORT=3001
   CORS_ORIGIN=http://localhost:3000
   UPLOAD_PATH=./uploads
   MAX_FILE_SIZE=5242880
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:3001` (or the port specified in your .env file).

## API Endpoints

### Authentication

#### Register User
```
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "restaurantName": "My Restaurant"
}
```

#### Login User
```
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Menus

#### Create Menu
```
POST /menus/restaurants/:restaurantId
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Lunch Menu",
  "description": "Our delicious lunch options",
  "items": ["itemId1", "itemId2"]
}
```

#### Get Restaurant Menus
```
GET /menus/restaurants/:restaurantId
Authorization: Bearer <token>
```

#### Get Specific Menu
```
GET /menus/:menuId
Authorization: Bearer <token>
```

#### Update Menu
```
PUT /menus/:menuId
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Menu Name",
  "description": "Updated description",
  "items": ["itemId1", "itemId2", "itemId3"]
}
```

#### Delete Menu
```
DELETE /menus/:menuId
Authorization: Bearer <token>
```

### Items

#### Create Item
```
POST /items/restaurants/:restaurantId
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Burger",
  "description": "Delicious beef burger",
  "price": 12.99,
  "category": "Main Course",
  "imageUrl": "https://example.com/burger.jpg",
  "isAvailable": true
}
```

#### Get Restaurant Items
```
GET /items/restaurants/:restaurantId
Authorization: Bearer <token>
```

#### Update Item
```
PUT /items/:itemId
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Burger",
  "price": 13.99,
  "isAvailable": false
}
```

#### Toggle Item Availability
```
PATCH /items/:itemId/toggle
Authorization: Bearer <token>
```

#### Delete Item
```
DELETE /items/:itemId
Authorization: Bearer <token>
```

### Displays

#### Create Display
```
POST /displays/restaurants/:restaurantId
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Kitchen Display",
  "currentMenu": "menuId"
}
```

#### Get Restaurant Displays
```
GET /displays/restaurants/:restaurantId
Authorization: Bearer <token>
```

#### Pair Display
```
POST /displays/pair
Content-Type: application/json

{
  "pairingCode": "ABC123"
}
```

#### Get Display by Pairing Code
```
GET /displays/pair/:pairingCode
```

#### Assign Menu to Display
```
PATCH /displays/:displayId/assign-menu
Authorization: Bearer <token>
Content-Type: application/json

{
  "menuId": "menuId"
}
```

#### Regenerate Pairing Code
```
PATCH /displays/:displayId/regenerate-pairing-code
Authorization: Bearer <token>
```

### Restaurants

#### Get Restaurant
```
GET /restaurants/:restaurantId
Authorization: Bearer <token>
```

#### Get User's Restaurant
```
GET /restaurants/my/restaurant
Authorization: Bearer <token>
```

#### Update Restaurant
```
PUT /restaurants/:restaurantId
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Restaurant Name"
}
```

#### Get Restaurant Statistics
```
GET /restaurants/:restaurantId/stats
Authorization: Bearer <token>
```

## Real-time Events (Socket.IO)

The API emits the following events for real-time updates:

### Menu Events
- `menu-created`: When a new menu is created
- `menu-updated`: When a menu is updated
- `menu-deleted`: When a menu is deleted

### Item Events
- `item-created`: When a new item is created
- `item-updated`: When an item is updated
- `item-deleted`: When an item is deleted
- `item-availability-changed`: When item availability is toggled

### Display Events
- `display-created`: When a new display is created
- `display-updated`: When a display is updated
- `display-paired`: When a display is paired
- `menu-assigned`: When a menu is assigned to a display

### Restaurant Events
- `restaurant-updated`: When restaurant information is updated

## Database Schema

### User
- `email`: String (unique, required)
- `password`: String (hashed, required)
- `restaurant`: ObjectId reference to Restaurant

### Restaurant
- `name`: String (required)
- `owner`: ObjectId reference to User
- `menus`: Array of ObjectId references to Menu
- `items`: Array of ObjectId references to Item
- `displays`: Array of ObjectId references to Display
- `schedules`: Array of ObjectId references to Schedule

### Item
- `name`: String (required)
- `description`: String
- `price`: Number (required, min: 0)
- `imageUrl`: String
- `category`: String (required)
- `isAvailable`: Boolean (default: true)

### Menu
- `name`: String (required)
- `description`: String
- `items`: Array of ObjectId references to Item

### Display
- `name`: String (required)
- `pairingCode`: String (unique, auto-generated)
- `currentMenu`: ObjectId reference to Menu

### Schedule
- `menu`: ObjectId reference to Menu (required)
- `display`: ObjectId reference to Display (required)
- `dayOfWeek`: String (enum: Monday-Sunday)
- `startTime`: String (required, format: "HH:MM")
- `endTime`: String (required, format: "HH:MM")

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for password security
- **Input Validation**: Express-validator for request validation
- **CORS Protection**: Configurable CORS settings
- **Authorization**: Route-level access control
- **Error Handling**: Comprehensive error handling and logging

## Development

### Running in Development Mode
```bash
npm run dev
```

### Running in Production Mode
```bash
npm start
```

### Health Check
```
GET /health
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/yardsign` |
| `JWT_SECRET` | Secret key for JWT tokens | Required |
| `PORT` | Server port | `3001` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:3000` |
| `UPLOAD_PATH` | File upload directory | `./uploads` |
| `MAX_FILE_SIZE` | Maximum file size in bytes | `5242880` (5MB) |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License. # yarnsign-backend
