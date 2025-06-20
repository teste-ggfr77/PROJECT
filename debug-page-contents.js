require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const PageContent = require('./models/PageContent');

async function debugPageContents() {
    try {
        console.log('Connecting to database...');
        await connectDB();
        
        const contents = await PageContent.find();
        console.log('Total page contents:', contents.length);
        
        if (contents.length > 0) {
            console.log('\nFound page contents:');
            contents.forEach((content, index) => {
                console.log(`\n${index + 1}. Content Details:`);
                console.log('- Type:', content.type);
                console.log('- Title:', content.title);
                console.log('- Is Active:', content.isActive);
                console.log('- Order:', content.order);
            });
        } else {
            console.log('No page contents found in the database');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDatabase connection closed');
    }
}

debugPageContents();
