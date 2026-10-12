import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
 testDir:'./e2e',timeout:30000,fullyParallel:false,workers:1,
 use:{baseURL:'http://127.0.0.1:5173/cube-steps/',trace:'retain-on-failure'},
 projects:[{name:'chromium',use:{...devices['Desktop Chrome']}},{name:'webkit',use:{...devices['Desktop Safari']}}],
 webServer:{command:'npm.cmd run dev -- --port 5173 --strictPort',url:'http://127.0.0.1:5173/cube-steps/',reuseExistingServer:true,timeout:30000},
});
