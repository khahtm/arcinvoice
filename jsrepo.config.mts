import { defineConfig } from 'jsrepo';

export default defineConfig({
    // configure where stuff comes from here
    registries: ['reactbits.dev'],
    // configure were stuff goes here
    paths: {
        'ts-tw': 'components/ui',
    },
});