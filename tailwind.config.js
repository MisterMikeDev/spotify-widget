/** @type {import('tailwindcss').Config} */
export default {
    content: ["./*.html"],
    theme: {
        extend: {
            colors: {
                backgroundSpotify: "#000",
                textSpotify: "#b3b3b3",
                containerSpotify: "#121212",
                containerSpotifyOther: "#181818",
                greenSpotify: "#1fdf64",
                tagSpotify: "hsla(0,0%,100%,.1)"
            }
        }
    },
    plugins: []
};
