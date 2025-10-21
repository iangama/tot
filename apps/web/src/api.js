let accessToken = null;
let refreshToken = null;

export function setTokens(a, r){ accessToken=a; refreshToken=r; localStorage.setItem("rt", r); }
export function loadRefresh(){ refreshToken = localStorage.getItem("rt"); }
export function clearTokens(){ accessToken=null; refreshToken=null; localStorage.removeItem("rt"); }
export function hasRefresh(){ return !!localStorage.getItem("rt"); }

async function request(path, opts={}){
  const headers = { "Content-Type":"application/json", ...(opts.headers||{}) };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  let res = await fetch(path, { ...opts, headers });
  if (res.status === 401 && refreshToken){
    const r = await fetch("/auth/refresh", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ refreshToken }) });
    if (r.ok){
      const d = await r.json();
      accessToken = d.accessToken;
      refreshToken = d.refreshToken;
      localStorage.setItem("rt", refreshToken);
      const headers2 = { "Content-Type":"application/json", Authorization: `Bearer ${accessToken}`, ...(opts.headers||{}) };
      res = await fetch(path, { ...opts, headers: headers2 });
    } else {
      clearTokens();
    }
  }
  return res;
}

export const api = {
  async register(email, password){
    const res = await fetch("/auth/register", {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ email, password })
    });
    if (res.status === 409) throw new Error("email_in_use");
    if (!res.ok) throw new Error("register_failed");
    return res.json();
  },
  async login(email, password){
    const res = await fetch("/auth/login", {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw new Error("login_failed");
    const d = await res.json();
    setTokens(d.accessToken, d.refreshToken);
    return d;
  },
  async logout(){
    if (refreshToken){
      await fetch("/auth/logout", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ refreshToken }) });
    }
    clearTokens();
  },
  async me(){ const r = await request("/auth/me"); if(!r.ok) throw new Error("unauthorized"); return r.json(); },
  async catalog(){ const r = await request("/catalog/items"); if(!r.ok) throw new Error("unauthorized"); return r.json(); },
  async addItem(name, price){
    const r = await request("/catalog/items", {
      method:"POST",
      body: JSON.stringify({ name, price: Number(price) })
    });
    if (!r.ok) throw new Error("add_failed");
    return r.json();
  },
  async order(itemId){
    const r = await request("/orders", { method:"POST", body: JSON.stringify({ itemId }) });
    if (!r.ok) throw new Error("order_failed");
    return r.json();
  }
};
