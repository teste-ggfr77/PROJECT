require('dotenv').config();
const mongoose = require('mongoose');
const PageContent = require('./models/PageContent');

// Use the MONGO_URI from .env
const MONGO_URI = process.env.MONGO_URI;

async function createNobullContent() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // Clear existing content
        await PageContent.deleteMany({});
        console.log('Cleared existing content');

        // Create hero section
        await PageContent.create({
            type: 'landing-hero',
            title: 'A Commitment to Growth',
            subtitle: 'An Invitation to Belong',
            backgroundColor: '#000000',
            textColor: '#ffffff',
            buttonText: 'Shop Collection',
            buttonLink: '/products',
            order: 0,
            isActive: true,
            customClass: 'nobull-hero'
        });
        console.log('Created hero section');

        // Create steps section
        await PageContent.create({
            type: 'steps-section',
            title: 'Steps and Reps',
            description: 'Strength isn\'t built in comfort zones. It\'s forged through repetition, resilience, and relentless effort.',
            backgroundColor: '#ffffff',
            textColor: '#000000',
            order: 1,
            isActive: true
        });
        console.log('Created steps section');

        // Create reviews section
        await PageContent.create({
            type: 'reviews-section',
            title: 'No Bullshit Reviews',
            description: 'Real talk from real people. No filters. Just honest feedback on what works — and what doesn\'t.',
            backgroundColor: '#000000',
            textColor: '#ffffff',
            order: 2,
            isActive: true
        });
        console.log('Created reviews section');

        // Create shop section
        await PageContent.create({
            type: 'shop-section',
            title: 'Shop the Look',
            subtitle: 'Style shouldn\'t sacrifice substance',
            description: 'Explore gear built for performance and designed to last.',
            backgroundColor: '#ffffff',
            textColor: '#000000',
            buttonText: 'Shop Now',
            buttonLink: '/products',
            order: 3,
            isActive: true
        });
        console.log('Created shop section');

        // Create video section
        await PageContent.create({
            type: 'video-section',
            title: 'Built Different',
            subtitle: 'For those who choose the harder path',
            backgroundColor: '#000000',
            textColor: '#ffffff',
            videoUrl: '/videos/training.mp4',
            buttonText: 'Join Now',
            buttonLink: '/register',
            order: 4,
            isActive: true
        });
        console.log('Created video section');

        console.log('Successfully created all Nobull-style content sections');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

createNobullContent();
