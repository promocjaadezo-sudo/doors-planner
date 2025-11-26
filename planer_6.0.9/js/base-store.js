// Minimal store backed by localStorage
(function(global){
  const KEY = 'planner_base_state_v1';
  const defaultState = { page:'dash', orders:[], employees:[], settings:{mode:'local'} };
  let state = defaultState;
  function load(){ try{ const raw = localStorage.getItem(KEY); state = raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(defaultState)); return state;}catch(e){ console.error('load error',e); state = JSON.parse(JSON.stringify(defaultState)); return state;} }
  function save(){ try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(e){ console.error('save error',e);} }
  function get(){ return state; }
  function set(s){ state = s; save(); }
  global.store = { load, save, get, set };
})(window);
