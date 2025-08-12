const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import models
const User = require('./models/User');
const Restaurant = require('./models/Restaurant');
const Item = require('./models/Item');
const Menu = require('./models/Menu');
const Display = require('./models/Display');

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Restaurant.deleteMany({});
    await Item.deleteMany({});
    await Menu.deleteMany({});
    await Display.deleteMany({});
    console.log('✅ Cleared existing data');

    // Create default user first
    const user = new User({
      email: 'admin@yardsign.com',
      password: 'password123', // Let the User model hash it
      restaurant: null // Will be set after restaurant creation
    });
    await user.save();
    console.log('✅ Created default user');

    // Create default restaurant
    const restaurant = new Restaurant({
      name: 'Demo Restaurant',
      owner: user._id
    });
    await restaurant.save();
    console.log('✅ Created default restaurant');

    // Update user with restaurant
    user.restaurant = restaurant._id;
    await user.save();

    // Create sample items
    const items = [
      {
        name: 'Classic Burger',
        description: 'Juicy beef burger with fresh lettuce, tomato, and special sauce',
        price: 12.99,
        category: 'Main Course',
        imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
        isAvailable: true
      },
      {
        name: 'Margherita Pizza',
        description: 'Traditional pizza with tomato sauce, mozzarella, and basil',
        price: 16.99,
        category: 'Main Course',
        imageUrl: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=400',
        isAvailable: true
      },
      {
        name: 'Caesar Salad',
        description: 'Fresh romaine lettuce with Caesar dressing, croutons, and parmesan',
        price: 8.99,
        category: 'Appetizer',
        imageUrl: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400',
        isAvailable: true
      },
      {
        name: 'Chocolate Milkshake',
        description: 'Rich and creamy chocolate milkshake with whipped cream',
        price: 5.99,
        category: 'Beverages',
        imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400',
        isAvailable: true
      },
      {
        name: 'French Fries',
        description: 'Crispy golden fries served with ketchup',
        price: 4.99,
        category: 'Sides',
        imageUrl: 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?w=400',
        isAvailable: true
      }
    ];

    const createdItems = await Item.insertMany(items);
    console.log('✅ Created sample items');

    // Add items to restaurant
    restaurant.items = createdItems.map(item => item._id);
    await restaurant.save();

    // Create sample menu
    const menu = new Menu({
      name: 'Lunch Menu',
      description: 'Our delicious lunch options',
      items: createdItems.map(item => item._id)
    });
    await menu.save();
    console.log('✅ Created sample menu');

    // Add menu to restaurant
    restaurant.menus.push(menu._id);
    await restaurant.save();

    // Create sample display
    const display = new Display({
      name: 'Kitchen Display',
      pairingCode: 'DEMO123',
      currentMenu: menu._id
    });
    await display.save();
    console.log('✅ Created sample display');

    // Add display to restaurant
    restaurant.displays.push(display._id);
    await restaurant.save();

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📋 Default Credentials:');
    console.log('Email: admin@yardsign.com');
    console.log('Password: password123');
    console.log('\n📺 Display Pairing Code: DEMO123');
    console.log('\n🔗 Restaurant ID:', restaurant._id);
    console.log('👤 User ID:', user._id);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the seeder
seedDatabase(); 