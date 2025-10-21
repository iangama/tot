import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import { api, loadRefresh, clearTokens, hasRefresh } from "./api";
import "./styles.css";

loadRefresh();

function Layout({ children, right }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight">tot</h1>
          <nav className="text-sm">
            <Link className="text-slate-600 hover:text-slate-900 mr-4" to="/login">Login</Link>
            <Link className="text-slate-600 hover:text-slate-900" to="/register">Registrar</Link>
          </nav>
        </header>
        <div className="grid md:grid-cols-4 gap-6">
          <main className="md:col-span-3">{children}</main>
          <aside className="md:col-span-1">{right}</aside>
        </div>
      </div>
    </div>
  );
}

const Card = ({ children, title, footer }) => (
  <div className="rounded-xl bg-white shadow border border-slate-200">
    <div className="p-5">
      {title && <h2 className="text-base font-semibold mb-3">{title}</h2>}
      {children}
    </div>
    {footer && <div className="px-5 pb-5">{footer}</div>}
  </div>
);

const Button = ({ children, className="", ...props }) => (
  <button
    className={"inline-flex items-center justify-center rounded-lg border border-slate-300 bg-slate-900 text-white px-3 py-2 text-sm hover:bg-slate-800 transition " + className}
    {...props}
  >{children}</button>
);

const Input = (props) => (
  <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300" {...props}/>
);

function usePublicPage(){ React.useEffect(()=>{ clearTokens(); },[]); }

function Login(){
  usePublicPage();
  const [email,setEmail]=React.useState(""); const [password,setPassword]=React.useState("");
  const [loading,setLoading]=React.useState(false); const [err,setErr]=React.useState("");
  const navigate=useNavigate();
  return (
    <Layout>
      <Card title="Entrar">
        <div className="space-y-3">
          <Input placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} />
          <Input placeholder="senha" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
          {err && <p className="text-red-600 text-sm">{err}</p>}
          <div className="flex items-center justify-between">
            <Button disabled={loading} onClick={async ()=>{
              setErr(""); setLoading(true);
              try { await api.login(email, password); navigate("/", {replace:true}); }
              catch { setErr("Falha no login"); }
              finally { setLoading(false); }
            }}>{loading?"Entrando...":"Login"}</Button>
            <Link className="text-sm text-slate-600 hover:text-slate-900" to="/register">Criar conta</Link>
          </div>
        </div>
      </Card>
    </Layout>
  );
}

function Register(){
  usePublicPage();
  const [email,setEmail]=React.useState(""); const [password,setPassword]=React.useState("");
  const [loading,setLoading]=React.useState(false); const [msg,setMsg]=React.useState(""); const [err,setErr]=React.useState("");
  const navigate=useNavigate();
  return (
    <Layout>
      <Card title="Criar conta">
        <div className="space-y-3">
          <Input placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} />
          <Input placeholder="senha" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
          {msg && <p className="text-green-700 text-sm">{msg}</p>}
          {err && <p className="text-red-600 text-sm">{err}</p>}
          <div className="flex items-center justify-between">
            <Button disabled={loading} onClick={async ()=>{
              setMsg(""); setErr(""); setLoading(true);
              try{
                await api.register(email, password);
                setMsg("Registrado! Entrando...");
                await api.login(email, password);
                navigate("/", { replace:true });
              }catch(e){
                if(e.message==="email_in_use") setErr("E-mail já está em uso");
                else setErr("Falha ao registrar");
              }finally{ setLoading(false); }
            }}>{loading?"Registrando...":"Registrar"}</Button>
            <Link className="text-sm text-slate-600 hover:text-slate-900" to="/login">Já tenho conta</Link>
          </div>
        </div>
      </Card>
    </Layout>
  );
}

function Guard({children}){
  const [ok,setOk]=React.useState(null);
  React.useEffect(()=>{
    if(!hasRefresh()){ setOk(false); return; }
    api.me().then(()=>setOk(true)).catch(()=>setOk(false));
  },[]);
  if(ok===null) return <Layout><Card title="Carregando..."/></Layout>;
  if(!ok) return <Navigate to="/login" replace />;
  return children;
}

// modal simples
function Modal({ open, onClose, title, children }){
  if(!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white shadow border border-slate-200 p-4" onClick={(e)=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">{title}</h3>
          <button className="text-slate-500" onClick={onClose}>✕</button>
        </div>
        <div className="text-sm">{children}</div>
        <div className="mt-4 text-right">
          <Button onClick={onClose}>OK</Button>
        </div>
      </div>
    </div>
  );
}

function Dashboard(){
  const [me,setMe]=React.useState(null);
  const [items,setItems]=React.useState([]);
  const [q,setQ]=React.useState("");
  const [sortAsc,setSortAsc]=React.useState(true);
  const [orders,setOrders]=React.useState([]);
  const [modal,setModal]=React.useState({open:false, id:null});

  const [newName,setNewName]=React.useState("");
  const [newPrice,setNewPrice]=React.useState("");
  const [errAdd,setErrAdd]=React.useState("");

  React.useEffect(()=>{ api.me().then(setMe).catch(()=>{}); },[]);
  React.useEffect(()=>{ api.catalog().then(setItems).catch(()=>{}); },[]);

  const filtered = items
    .filter(i => (i.name.toLowerCase().includes(q.toLowerCase()) || i.id.includes(q)))
    .sort((a,b) => sortAsc ? a.price - b.price : b.price - a.price);

  return (
    <Layout
      right={
        <Card title="Pedidos recentes">
          {orders.length===0 ? <p className="text-slate-500 text-sm">Nenhum pedido ainda.</p> :
            <ul className="text-sm space-y-2">
              {orders.slice(0,8).map(o=>(
                <li key={o.id} className="flex items-center justify-between">
                  <span className="truncate">{o.id}</span>
                  <span className="text-slate-500">{o.itemId||"—"}</span>
                </li>
              ))}
            </ul>
          }
        </Card>
      }
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Dashboard</h2>
          <p className="text-slate-600 text-sm">Área privada protegida por JWT (access + refresh automático).</p>
        </div>
        <div className="text-right">
          {me && <p className="text-sm text-slate-500 mb-1">{me.email}</p>}
          <Button onClick={()=> api.logout().then(()=>window.location.href="/app/login")}>Sair</Button>
        </div>
      </div>

      <Card>
        {/* linha de controles */}
        <div className="flex items-center gap-2 mb-3">
          <Input placeholder="Buscar por nome ou ID..." value={q} onChange={e=>setQ(e.target.value)} />
          <Button onClick={()=>setSortAsc(s=>!s)}>{sortAsc ? "Preço ↑" : "Preço ↓"}</Button>
        </div>

        {/* form de adição */}
        <div className="flex flex-wrap items-end gap-2 mb-4">
          <div className="grow min-w-[200px]">
            <label className="block text-xs text-slate-500 mb-1">Nome</label>
            <Input placeholder="Ex.: Suporte Articulado" value={newName} onChange={e=>setNewName(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Preço (R$)</label>
            <Input type="number" step="0.01" placeholder="0.00" value={newPrice} onChange={e=>setNewPrice(e.target.value)} />
          </div>
          <Button className="bg-emerald-600 hover:bg-emerald-700 border-emerald-700"
            onClick={async ()=>{
              setErrAdd("");
              const price = Number(newPrice);
              if (!newName.trim() || Number.isNaN(price)) { setErrAdd("Preencha nome e preço válido"); return; }
              try{
                const created = await api.addItem(newName.trim(), price);
                setItems(prev => [...prev, created]);
                setNewName(""); setNewPrice("");
              }catch{ setErrAdd("Falha ao adicionar"); }
            }}
          >Adicionar</Button>
          {errAdd && <span className="text-red-600 text-sm">{errAdd}</span>}
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-2">ID</th>
                <th className="text-left px-4 py-2">Nome</th>
                <th className="text-right px-4 py-2">Preço</th>
                <th className="text-right px-4 py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(it=>(
                <tr key={it.id} className="odd:bg-white even:bg-slate-50/60">
                  <td className="px-4 py-2">{it.id}</td>
                  <td className="px-4 py-2">{it.name}</td>
                  <td className="px-4 py-2 text-right">R$ {it.price.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right">
                    <Button className="bg-emerald-600 hover:bg-emerald-700 border-emerald-700"
                      onClick={async ()=>{
                        try{
                          const o = await api.order(it.id);
                          setOrders(prev => [{ id:o.id, itemId:o.itemId }, ...prev]);
                          setModal({open:true, id:o.id});
                        }catch{ /* noop */ }
                      }}
                    >Comprar</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={modal.open} onClose={()=>setModal({open:false,id:null})} title="Pedido criado">
        <p>Seu pedido foi criado com sucesso.</p>
        <p className="mt-2"><span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">ID: {modal.id}</span></p>
      </Modal>
    </Layout>
  );
}

function App(){
  return (
    <BrowserRouter basename="/app">
      <Routes>
        <Route path="/" element={<Guard><Dashboard/></Guard>} />
        <Route path="/login" element={<Login/>} />
        <Route path="/register" element={<Register/>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

createRoot(document.getElementById("root")).render(<App />);
