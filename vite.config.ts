import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    return {
        plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
        build: {
            // Ship ONE stylesheet instead of per-route CSS chunks. With split
            // CSS, switching top-nav tabs renders the new route before its CSS
            // chunk arrives, flashing fallback fonts/styles for a beat.
            cssCodeSplit: false
        },
        define: {
            __API_BASE_URL__: JSON.stringify(
                env.API_BASE_URL || 'http://localhost:8080'
            )
        }
    };
});
