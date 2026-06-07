import './stats.css';
import StatsApp from './stats/StatsApp.svelte';
import { mount } from 'svelte';

mount(StatsApp, {
  target: document.getElementById('stats-app')!,
});
