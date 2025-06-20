router.get('/', async (req, res) => {
    try {
        const contents = {
            sections: [
                {
                    id: 'hero-1',
                    type: 'hero',
                    data: {
                        title: 'Welcome to Our Store',
                        subtitle: 'Shop the latest trends',
                        image: '/images/hero.jpg',
                        buttonText: 'Shop Now',
                        buttonLink: '/products'
                    }
                },
                // Add other sections as needed
            ]
        };
        
        res.render('index', { 
            contents,
            user: req.user // Assuming you're using authentication
        });
    } catch (error) {
        console.error('Error rendering homepage:', error);
        res.status(500).send('Error loading the homepage');
    }
});
