/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
        extend: {
            container: {
                center: true,
                padding: '1rem',
            },
            typography: {
                DEFAULT: {
                    css: {
                        maxWidth: 'none',
                        color: '#374151',
                        a: {
                            color: '#2563eb',
                            '&:hover': {
                                color: '#1d4ed8',
                            },
                        },
                        'h1, h2, h3, h4': {
                            color: '#1f2937',
                            fontWeight: '700',
                        },
                    },
                },
            },
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
    ],
}
