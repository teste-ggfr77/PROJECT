require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const PageContent = require('./models/PageContent');

async function createSampleContent() {
    try {
        await connectDB();
        
        // Create featured content section
        const featuredContent = new PageContent({
            type: 'featured',
            title: 'FEATURED COLLECTION',
            subtitle: 'Discover Our Top Picks',
            items: [
                {
                    title: 'Training Essentials',
                    description: 'High-performance gear designed for maximum durability and comfort.',
                    image: '/uploads/1749732989418.jpg',
                    category: 'Training',
                    ctaText: 'Shop Now',
                    ctaLink: '/products/training'
                },
                {
                    title: 'CrossFit Series',
                    description: 'Engineered for the demands of intense CrossFit workouts.',
                    image: '/uploads/1749736133349.jpg',
                    category: 'CrossFit',
                    ctaText: 'Explore',
                    ctaLink: '/products/crossfit'
                },
                {
                    title: 'Running Collection',
                    description: 'Minimal design meets maximum performance for runners.',
                    image: '/uploads/1749736317459.jpg',
                    category: 'Running',
                    ctaText: 'View Collection',
                    ctaLink: '/products/running'
                }
            ],
            theme: 'dark',
            layout: 'contained',
            backgroundColor: '#000000',
            textColor: '#ffffff'
        });

        await featuredContent.save();
        console.log('Sample featured content created successfully');
        
    } catch (error) {
        console.error('Error creating sample content:', error);
    } finally {
        await mongoose.connection.close();
    }
}

createSampleContent();