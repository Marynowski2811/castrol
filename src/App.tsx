import { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, query, addDoc, serverTimestamp, doc, getDoc, setDoc, where, orderBy, getDocs } from 'firebase/firestore';
import { ShoppingCart, User as UserIcon, Package, LogOut, Search, Menu, X, ChevronRight, Star, ShieldCheck, Truck, CreditCard, RefreshCw, QrCode, FileText, Wallet, CheckCircle2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, signIn, logOut, handleFirestoreError, OperationType, signUpWithEmail, loginWithEmail } from './firebase';
import { Product, CartItem, Order, UserProfile, Category } from './types';
import { cn } from './lib/utils';

// Contexts
const CartContext = createContext<{
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, delta: number) => void;
  clearCart: () => void;
  total: number;
}>({
  cart: [],
  addToCart: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  total: 0,
});

const AuthContext = createContext<{
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}>({
  user: null,
  profile: null,
  loading: true,
});

// Components
const AuthModal = ({ isOpen, onClose, initialMode }: { isOpen: boolean, onClose: () => void, initialMode: 'login' | 'signup' }) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!name.trim()) throw new Error('Nome é obrigatório');
        if (password !== confirmPassword) throw new Error('As senhas não coincidem');
        await signUpWithEmail(email, password, name);
      } else {
        await loginWithEmail(email, password);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-castrol-green" />
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>

            <div className="text-center mb-8">
              <h2 className="text-2xl font-display font-black text-castrol-dark">
                {mode === 'login' ? 'Bem-vindo de volta' : 'Criar sua conta'}
              </h2>
              <p className="text-gray-500 text-sm mt-2">
                {mode === 'login' ? 'Entre para gerenciar seus pedidos' : 'Cadastre-se para começar a comprar'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 ml-1">Nome</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="Seu nome completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 ml-1">E-mail</label>
                <input
                  type="email"
                  required
                  className="input-field"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 ml-1">Senha</label>
                <input
                  type="password"
                  required
                  className="input-field"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 ml-1">Confirmar Senha</label>
                  <input
                    type="password"
                    required
                    className="input-field"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-castrol-green text-white rounded-xl font-bold hover:bg-castrol-green/90 transition-all active:scale-95 shadow-lg shadow-castrol-green/20 disabled:opacity-50"
              >
                {loading ? 'Processando...' : (mode === 'login' ? 'Entrar' : 'Criar Conta')}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-500">
                {mode === 'login' ? 'Ainda não tem conta?' : 'Já tem uma conta?'}
                <button
                  onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                  className="ml-2 text-castrol-green font-bold hover:underline"
                >
                  {mode === 'login' ? 'Cadastre-se' : 'Faça login'}
                </button>
              </p>
              
              <div className="mt-4 flex items-center gap-4">
                <div className="flex-grow h-px bg-gray-100" />
                <span className="text-xs text-gray-400 uppercase font-bold">ou</span>
                <div className="flex-grow h-px bg-gray-100" />
              </div>

              <button
                onClick={() => { signIn(); onClose(); }}
                className="mt-4 w-full py-3 border-2 border-gray-100 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
              >
                <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
                Continuar com Google
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const Navbar = () => {
  const { cart } = useContext(CartContext);
  const { user, profile } = useContext(AuthContext);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const openAuth = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-castrol-green rounded-lg flex items-center justify-center transition-transform group-hover:scale-110">
              <span className="text-white font-display font-black text-xl italic">C</span>
            </div>
            <span className="font-display font-extrabold text-2xl tracking-tighter text-castrol-green">
              CASTROL<span className="text-castrol-red">HUB</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="font-medium hover:text-castrol-green transition-colors">Produtos</Link>
            <Link to="/orders" className="font-medium hover:text-castrol-green transition-colors">Meus Pedidos</Link>
            {profile?.role === 'admin' && (
              <button 
                onClick={async () => {
                  if (confirm('Deseja sincronizar o catálogo de produtos? Isso adicionará novos produtos se não existirem.')) {
                    // The seeding logic will run on reload if the DB is empty, 
                    // but since I want to be able to add NEW products to an existing DB, 
                    // I'll implement a more robust sync in the seedProducts function itself.
                    // For now, I'll just trigger a reload and I'll update the seedProducts function to be more robust.
                    window.location.reload();
                  }
                }}
                className="flex items-center gap-1 font-medium text-castrol-green hover:opacity-80 transition-opacity"
              >
                <RefreshCw className="w-4 h-4" />
                Sincronizar
              </button>
            )}
            
            <div className="flex items-center gap-4 border-l pl-8 border-gray-200">
              <Link to="/cart" className="relative p-2 hover:bg-gray-50 rounded-full transition-colors">
                <ShoppingCart className="w-6 h-6" />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-castrol-red text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                    {cart.reduce((acc, item) => acc + item.quantity, 0)}
                  </span>
                )}
              </Link>
              
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="text-right hidden lg:block">
                    <p className="text-sm font-bold leading-none">{profile?.displayName || user.displayName}</p>
                    <p className="text-xs text-gray-500">{profile?.role === 'admin' ? 'Administrador' : 'Cliente'}</p>
                  </div>
                  <button onClick={logOut} className="p-2 hover:bg-red-50 text-gray-400 hover:text-castrol-red rounded-full transition-colors">
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={() => openAuth('login')} className="btn-outline py-2 px-4 text-sm border-castrol-green text-castrol-green hover:bg-castrol-green hover:text-white">
                    Entrar
                  </button>
                  <button onClick={() => openAuth('signup')} className="btn-primary py-2 px-4 text-sm">
                    Criar Conta
                  </button>
                </div>
              )}
            </div>
          </div>

          <button className="md:hidden p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        initialMode={authMode} 
      />

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-gray-100 overflow-hidden"
          >
            <div className="px-4 py-6 space-y-4">
              <Link to="/" onClick={() => setIsMenuOpen(false)} className="block text-lg font-medium">Produtos</Link>
              <Link to="/orders" onClick={() => setIsMenuOpen(false)} className="block text-lg font-medium">Meus Pedidos</Link>
              {profile?.role === 'admin' && (
                <button 
                  onClick={async () => {
                    if (confirm('Deseja sincronizar o catálogo de produtos?')) {
                      window.location.reload();
                    }
                  }}
                  className="flex items-center gap-2 text-lg font-medium text-castrol-green"
                >
                  <RefreshCw className="w-5 h-5" />
                  Sincronizar Produtos
                </button>
              )}
              <Link to="/cart" onClick={() => setIsMenuOpen(false)} className="block text-lg font-medium">Carrinho ({cart.length})</Link>
              {!user && (
                <div className="space-y-2">
                  <button onClick={() => { openAuth('login'); setIsMenuOpen(false); }} className="w-full btn-outline border-castrol-green text-castrol-green">Entrar</button>
                  <button onClick={() => { openAuth('signup'); setIsMenuOpen(false); }} className="w-full btn-primary">Criar Conta</button>
                </div>
              )}
              {user && (
                <button onClick={() => { logOut(); setIsMenuOpen(false); }} className="w-full btn-outline text-castrol-red border-castrol-red">Sair</button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const ProductCard = ({ product }: { product: Product }) => {
  const { addToCart } = useContext(CartContext);
  
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="castrol-card group overflow-hidden flex flex-col h-full"
    >
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        <img 
          src={product.imageUrl} 
          alt={product.name}
          className="w-full h-full object-contain p-6 transition-transform duration-500 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-3 left-3">
          <span className="bg-castrol-green/10 text-castrol-green text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
            {product.category}
          </span>
        </div>
      </div>
      
      <div className="p-5 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-display font-bold text-lg leading-tight group-hover:text-castrol-green transition-colors">
            {product.name}
          </h3>
        </div>
        
        <div className="flex items-center gap-2 mb-4">
          <div className="flex text-yellow-400">
            {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-current" />)}
          </div>
          <span className="text-xs text-gray-400">(48 avaliações)</span>
        </div>

        <div className="mt-auto">
          <div className="flex items-baseline gap-1 mb-4">
            <span className="text-xs font-bold text-gray-400">R$</span>
            <span className="text-2xl font-display font-black text-castrol-dark">
              {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          
          <button 
            onClick={() => addToCart(product)}
            className="w-full btn-primary py-2.5 flex items-center justify-center gap-2 text-sm"
          >
            <ShoppingCart className="w-4 h-4" />
            Adicionar
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const Home = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<Category | 'All'>('All');

  useEffect(() => {
    const q = collection(db, 'products');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(items);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });
    return unsubscribe;
  }, []);

  const filteredProducts = activeCategory === 'All' 
    ? products 
    : products.filter(p => p.category === activeCategory);

  const categories: (Category | 'All')[] = ['All', 'Engine Oil', 'Transmission Fluid', 'Brake Fluid', 'Grease', 'Motorcycle Oil', 'Heavy Duty', 'Maintenance', 'Coolant'];

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-12 h-12 border-4 border-castrol-green border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Section */}
      <div className="relative rounded-3xl overflow-hidden mb-16 h-[400px] flex items-center">
        <img 
          src="https://picsum.photos/seed/castrol/1920/1080" 
          className="absolute inset-0 w-full h-full object-cover brightness-[0.4]"
          referrerPolicy="no-referrer"
        />
        <div className="relative z-10 px-8 md:px-16 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block bg-castrol-red text-white text-xs font-black px-3 py-1 rounded-full mb-4 uppercase tracking-widest">
              Performance Máxima
            </span>
            <h1 className="text-4xl md:text-6xl text-white mb-6 leading-[1.1]">
              Lubrificantes que <span className="text-castrol-green">protegem</span> seu motor.
            </h1>
            <p className="text-gray-300 text-lg mb-8">
              A tecnologia Castrol garante maior vida útil e eficiência para seu veículo em qualquer condição.
            </p>
            <button className="btn-primary">Ver Ofertas</button>
          </motion.div>
        </div>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-3 mb-12">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "px-6 py-2 rounded-full text-sm font-bold transition-all",
              activeCategory === cat 
                ? "bg-castrol-green text-white shadow-lg shadow-castrol-green/20" 
                : "bg-white text-gray-500 hover:bg-gray-50 border border-gray-100"
            )}
          >
            {cat === 'All' ? 'Todos' : cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      
      {filteredProducts.length === 0 && (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
          <Package className="w-16 h-16 mx-auto text-gray-200 mb-4" />
          <h3 className="text-xl font-bold text-gray-400">Nenhum produto encontrado</h3>
        </div>
      )}
    </div>
  );
};

const Cart = () => {
  const { cart, updateQuantity, removeFromCart, total } = useContext(CartContext);
  const navigate = useNavigate();

  if (cart.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShoppingCart className="w-10 h-10 text-gray-300" />
        </div>
        <h2 className="text-3xl font-display font-bold mb-4">Seu carrinho está vazio</h2>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">
          Parece que você ainda não adicionou nenhum lubrificante Castrol ao seu carrinho.
        </p>
        <Link to="/" className="btn-primary inline-block">Voltar para a Loja</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-4xl mb-12">Carrinho de Compras</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-6">
          {cart.map((item) => (
            <div key={item.id} className="castrol-card p-6 flex gap-6 items-center">
              <div className="w-24 h-24 bg-gray-50 rounded-lg p-2 shrink-0">
                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
              </div>
              <div className="flex-grow">
                <h3 className="font-bold text-lg">{item.name}</h3>
                <p className="text-sm text-gray-400 mb-4">{item.viscosity} • {item.volume}</p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                    <button 
                      onClick={() => updateQuantity(item.id, -1)}
                      className="px-3 py-1 hover:bg-gray-50 transition-colors"
                    >
                      -
                    </button>
                    <span className="px-4 font-bold">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, 1)}
                      className="px-3 py-1 hover:bg-gray-50 transition-colors"
                    >
                      +
                    </button>
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.id)}
                    className="text-castrol-red text-sm font-bold hover:underline"
                  >
                    Remover
                  </button>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-display font-black">
                  R$ {(item.price * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-400">R$ {item.price.toLocaleString('pt-BR')} cada</p>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          <div className="castrol-card p-8 sticky top-24">
            <h3 className="text-xl mb-6">Resumo do Pedido</h3>
            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span>R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Frete</span>
                <span className="text-castrol-green font-bold">Grátis</span>
              </div>
              <div className="border-t pt-4 flex justify-between items-end">
                <span className="font-bold">Total</span>
                <span className="text-3xl font-display font-black text-castrol-green">
                  R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            <button 
              onClick={() => navigate('/checkout')}
              className="w-full btn-primary py-4 flex items-center justify-center gap-2"
            >
              Finalizar Compra
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="mt-6 flex items-center justify-center gap-4 text-gray-400">
              <ShieldCheck className="w-5 h-5" />
              <span className="text-xs font-medium">Pagamento 100% Seguro</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Checkout = () => {
  const { cart, total, clearCart } = useContext(CartContext);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit' | 'debit' | 'boleto'>('credit');
  const [installments, setInstallments] = useState(1);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showErrorModal, setShowErrorModal] = useState(false);

  const getInterestRate = (num: number) => {
    if (num >= 10) return 0.15;
    if (num >= 7) return 0.10;
    if (num >= 4) return 0.05;
    return 0;
  };

  const installmentOptions = Array.from({ length: 12 }, (_, i) => {
    const num = i + 1;
    const interest = getInterestRate(num);
    let value = (total * (1 + interest)) / num;
    // Apply rounding for 1x, 2x, 3x as requested
    if (num <= 3) {
      value = Math.round(value);
    }
    return { num, value, interest };
  });

  const selectedInstallment = installmentOptions.find(opt => opt.num === installments) || installmentOptions[0];
  const currentTotal = paymentMethod === 'credit' ? selectedInstallment.value * selectedInstallment.num : total;

  const handlePlaceOrder = async () => {
    if (!user) {
      signIn();
      return;
    }

    const errors: string[] = [];
    if (!address.trim() || address.trim().length < 10) {
      errors.push('Endereço de entrega deve ser completo (mínimo 10 caracteres).');
    }
    
    if (paymentMethod === 'credit' || paymentMethod === 'debit') {
      const cleanCard = cardNumber.replace(/\s/g, '');
      if (!cleanCard || cleanCard.length < 13) {
        errors.push('Número do cartão inválido.');
      }
      if (!expiry.trim() || !expiry.includes('/')) {
        errors.push('Validade do cartão inválida (use MM/AA).');
      }
      if (!cvv.trim() || cvv.length < 3) {
        errors.push('CVV do cartão inválido (mínimo 3 dígitos).');
      }
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      setShowErrorModal(true);
      return;
    }

    setIsProcessing(true);
    try {
      const orderData: Omit<Order, 'id'> = {
        userId: user.uid,
        items: cart.map(item => ({
          productId: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        total: currentTotal,
        status: 'paid',
        shippingAddress: address,
        paymentMethod: paymentMethod.toUpperCase() + (paymentMethod === 'credit' ? ` (${installments}x)` : ''),
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'orders'), orderData);
      clearCart();
      navigate('/orders');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'orders');
    } finally {
      setIsProcessing(false);
    }
  };

  const paymentOptions = [
    { id: 'pix', name: 'PIX', icon: QrCode },
    { id: 'credit', name: 'Cartão de Crédito', icon: CreditCard },
    { id: 'debit', name: 'Cartão de Débito', icon: Wallet },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-4xl mb-12">Finalizar Pedido</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-8">
          <section className="space-y-4">
            <h3 className="flex items-center gap-2 text-xl">
              <Truck className="w-5 h-5 text-castrol-green" />
              Entrega
            </h3>
            <textarea 
              placeholder="Endereço completo (Rua, Número, Complemento, CEP)"
              className="input-field min-h-[120px]"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </section>

          <section className="space-y-4">
            <h3 className="flex items-center gap-2 text-xl">
              <CreditCard className="w-5 h-5 text-castrol-green" />
              Forma de Pagamento
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {paymentOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setPaymentMethod(option.id as any)}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left",
                    paymentMethod === option.id 
                      ? "border-castrol-green bg-castrol-green/5 ring-1 ring-castrol-green" 
                      : "border-gray-100 hover:border-gray-200 bg-white"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      paymentMethod === option.id ? "bg-castrol-green text-white" : "bg-gray-100 text-gray-400"
                    )}>
                      <option.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{option.name}</p>
                    </div>
                  </div>
                  {paymentMethod === option.id && (
                    <CheckCircle2 className="w-5 h-5 text-castrol-green" />
                  )}
                </button>
              ))}
            </div>

            {/* Payment Details Simulation */}
            <div className="mt-6">
              {paymentMethod === 'pix' && (
                <div className="bg-gray-50 rounded-2xl p-6 text-center border border-dashed border-gray-200">
                  <QrCode className="w-32 h-32 mx-auto mb-4 text-gray-300" />
                  <p className="text-sm text-gray-500">O QR Code será gerado após a confirmação do pedido.</p>
                </div>
              )}
              {(paymentMethod === 'credit' || paymentMethod === 'debit') && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <input 
                      type="text" 
                      placeholder="Número do Cartão" 
                      className="input-field col-span-2" 
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                    />
                    <input 
                      type="text" 
                      placeholder="Validade (MM/AA)" 
                      className="input-field" 
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                    />
                    <input 
                      type="text" 
                      placeholder="CVV" 
                      className="input-field" 
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value)}
                    />
                  </div>
                  {paymentMethod === 'credit' && (
                    <select 
                      className="input-field bg-castrol-green/5 font-bold border-castrol-green/30"
                      value={installments}
                      onChange={(e) => setInstallments(Number(e.target.value))}
                    >
                      {installmentOptions.map((opt) => (
                        <option key={opt.num} value={opt.num}>
                          {opt.num}x de R$ {opt.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
                          {opt.interest > 0 ? ` (+${(opt.interest * 100).toFixed(0)}% juros)` : ' (Sem juros)'}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>

        <div>
          <div className="castrol-card p-8 sticky top-24">
            <h3 className="text-xl mb-6">Seu Pedido</h3>
            <div className="space-y-4 mb-8 max-h-60 overflow-y-auto pr-2">
              {cart.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-500">{item.quantity}x {item.name}</span>
                  <span className="font-bold">R$ {(item.price * item.quantity).toLocaleString('pt-BR')}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-4 flex justify-between items-end mb-8">
              <span className="font-bold">Total Final</span>
              <span className="text-3xl font-display font-black text-castrol-green">
                R$ {currentTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <button 
              onClick={handlePlaceOrder}
              disabled={isProcessing}
              className="w-full btn-primary py-4 disabled:bg-gray-300 flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processando...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  Confirmar e Pagar
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error Modal */}
      <AnimatePresence>
        {showErrorModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowErrorModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ 
                opacity: 1, 
                scale: 1, 
                y: 0,
                x: [0, -10, 10, -10, 10, 0] 
              }}
              transition={{
                x: { duration: 0.4, times: [0, 0.2, 0.4, 0.6, 0.8, 1] }
              }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-castrol-red" />
              <button 
                onClick={() => setShowErrorModal(false)}
                className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
              
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-castrol-red/10 rounded-full flex items-center justify-center mb-6">
                  <AlertTriangle className="w-10 h-10 text-castrol-red" />
                </div>
                
                <h2 className="text-2xl font-display font-black text-castrol-dark mb-4">
                  Ops! Algo está faltando
                </h2>
                
                <div className="space-y-3 mb-8 w-full">
                  {validationErrors.map((error, index) => (
                    <div 
                      key={index}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 text-left"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-castrol-red shrink-0" />
                      <p className="text-sm text-gray-600 font-medium">{error}</p>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setShowErrorModal(false)}
                  className="w-full py-4 bg-castrol-dark text-white rounded-xl font-bold hover:bg-castrol-dark/90 transition-all active:scale-95 shadow-lg shadow-castrol-dark/20"
                >
                  Entendi, vou corrigir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Orders = () => {
  const { user } = useContext(AuthContext);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(items);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    return unsubscribe;
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl font-bold mb-4">Acesse sua conta</h2>
        <p className="text-gray-500 mb-8">Você precisa estar logado para ver seus pedidos.</p>
        <button onClick={signIn} className="btn-primary">Entrar com Google</button>
      </div>
    );
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-12 h-12 border-4 border-castrol-green border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-4xl mb-12">Meus Pedidos</h1>
      
      <div className="space-y-8">
        {orders.map((order) => (
          <div key={order.id} className="castrol-card overflow-hidden">
            <div className="bg-gray-50 px-8 py-4 flex flex-wrap justify-between items-center gap-4 border-b border-gray-100">
              <div className="flex gap-8">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black">Pedido</p>
                  <p className="text-sm font-bold">#{order.id?.slice(-8).toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black">Data</p>
                  <p className="text-sm font-bold">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black">Total</p>
                  <p className="text-sm font-bold">R$ {order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black">Pagamento</p>
                  <p className="text-sm font-bold">{order.paymentMethod}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                  order.status === 'paid' ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                )}>
                  {order.status === 'paid' ? 'Pagamento Confirmado' : order.status}
                </span>
              </div>
            </div>
            
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-4">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-50 rounded flex items-center justify-center p-1">
                          <Package className="w-6 h-6 text-gray-300" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{item.name}</p>
                          <p className="text-xs text-gray-400">Quantidade: {item.quantity}</p>
                        </div>
                      </div>
                      <p className="font-bold text-sm">R$ {(item.price * item.quantity).toLocaleString('pt-BR')}</p>
                    </div>
                  ))}
                </div>
                
                <div className="bg-castrol-gray/50 rounded-xl p-6">
                  <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Endereço de Entrega</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">{order.shippingAddress}</p>
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="flex items-center gap-3 text-castrol-green">
                      <Truck className="w-5 h-5" />
                      <span className="text-sm font-bold">Previsão de entrega: 3-5 dias úteis</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {orders.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
            <Package className="w-16 h-16 mx-auto text-gray-200 mb-4" />
            <h3 className="text-xl font-bold text-gray-400">Você ainda não fez nenhum pedido</h3>
            <Link to="/" className="btn-primary mt-6 inline-block">Começar a Comprar</Link>
          </div>
        )}
      </div>
    </div>
  );
};

// Main App Component
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setProfile(userDoc.data() as UserProfile);
        } else {
          const isAdminUser = firebaseUser.email === 'admincastrol@admin.com';
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || '',
            role: isAdminUser ? 'admin' : 'customer'
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Seed data if needed
  useEffect(() => {
    const seedProducts = async () => {
      const snap = await getDocs(collection(db, 'products'));
      const existingNames = snap.docs.map(doc => doc.data().name);
      
      const initialProducts: Omit<Product, 'id'>[] = [
          {
            name: "Castrol EDGE 5W-30 LL",
            description: "Óleo de motor totalmente sintético com tecnologia Fluid TITANIUM. Máxima performance para motores modernos.",
            price: 189.90,
            imageUrl: "https://picsum.photos/seed/edge5w30/600/600",
            category: "Engine Oil",
            viscosity: "5W-30",
            volume: "1L",
            stock: 100
          },
          {
            name: "Castrol EDGE Professional 5W-30",
            description: "Desenvolvido em parceria com fabricantes de veículos para garantir a máxima performance.",
            price: 198.00,
            imageUrl: "https://picsum.photos/seed/edgeprof/600/600",
            category: "Engine Oil",
            viscosity: "5W-30",
            volume: "1L",
            stock: 80
          },
          {
            name: "Castrol EDGE Supercar 10W-60",
            description: "Testado no auge da engenharia automotiva para uso em supercarros e motores de alta performance.",
            price: 245.00,
            imageUrl: "https://picsum.photos/seed/edgesuper/600/600",
            category: "Engine Oil",
            viscosity: "10W-60",
            volume: "1L",
            stock: 30
          },
          {
            name: "Castrol EDGE 0W-40 A3/B4",
            description: "Máxima performance para motores que operam sob altas pressões.",
            price: 210.00,
            imageUrl: "https://picsum.photos/seed/edge0w40/600/600",
            category: "Engine Oil",
            viscosity: "0W-40",
            volume: "1L",
            stock: 50
          },
          {
            name: "Castrol MAGNATEC 0W-20 DX",
            description: "Proteção instantânea desde a partida. Ideal para motores modernos que exigem baixa viscosidade.",
            price: 165.00,
            imageUrl: "https://picsum.photos/seed/mag0w20/600/600",
            category: "Engine Oil",
            viscosity: "0W-20",
            volume: "1L",
            stock: 150
          },
          {
            name: "Castrol MAGNATEC 5W-30 A5",
            description: "Moléculas inteligentes que aderem como um ímã, fornecendo uma camada extra de proteção.",
            price: 155.00,
            imageUrl: "https://picsum.photos/seed/magnatec5w30/600/600",
            category: "Engine Oil",
            viscosity: "5W-30",
            volume: "1L",
            stock: 120
          },
          {
            name: "Castrol MAGNATEC 5W-40 A3/B4",
            description: "Proteção superior em todas as condições de direção e temperaturas.",
            price: 158.00,
            imageUrl: "https://picsum.photos/seed/mag5w40/600/600",
            category: "Engine Oil",
            viscosity: "5W-40",
            volume: "1L",
            stock: 110
          },
          {
            name: "Castrol MAGNATEC SUV 5W-30 C3",
            description: "Proteção específica para as demandas severas de condução urbana de SUVs.",
            price: 172.00,
            imageUrl: "https://picsum.photos/seed/magsuv/600/600",
            category: "Engine Oil",
            viscosity: "5W-30",
            volume: "1L",
            stock: 90
          },
          {
            name: "Castrol MAGNATEC 10W-40 A3",
            description: "Proteção superior contra o desgaste do motor em todas as condições de direção.",
            price: 148.00,
            imageUrl: "https://picsum.photos/seed/mag10w40/600/600",
            category: "Engine Oil",
            viscosity: "10W-40",
            volume: "1L",
            stock: 200
          },
          {
            name: "Castrol GTX Ultraclean 5W-30",
            description: "Fórmula de dupla ação que limpa a borra e protege contra a formação de novas sujeiras.",
            price: 135.00,
            imageUrl: "https://picsum.photos/seed/gtx5w30/600/600",
            category: "Engine Oil",
            viscosity: "5W-30",
            volume: "1L",
            stock: 160
          },
          {
            name: "Castrol GTX Ultraclean 10W-40",
            description: "Tecnologia semissintética para manter o motor limpo por mais tempo.",
            price: 128.00,
            imageUrl: "https://picsum.photos/seed/gtx10w40/600/600",
            category: "Engine Oil",
            viscosity: "10W-40",
            volume: "1L",
            stock: 140
          },
          {
            name: "Castrol GTX Ultraclean 15W-40",
            description: "Limpa a borra antiga e protege contra a formação de novas sujeiras.",
            price: 42.50,
            imageUrl: "https://picsum.photos/seed/gtx15w40/600/600",
            category: "Engine Oil",
            viscosity: "15W-40",
            volume: "1L",
            stock: 180
          },
          {
            name: "Castrol GTX Anti-Borra 20W-50",
            description: "Ajuda a estender a vida útil do motor, combatendo as principais causas de borra.",
            price: 38.90,
            imageUrl: "https://picsum.photos/seed/gtx20w50/600/600",
            category: "Engine Oil",
            viscosity: "20W-50",
            volume: "1L",
            stock: 200
          },
          {
            name: "Castrol GTX High Mileage 25W-60",
            description: "Especialmente formulado para motores com mais de 100.000 km.",
            price: 44.90,
            imageUrl: "https://picsum.photos/seed/gtxhigh/600/600",
            category: "Engine Oil",
            viscosity: "25W-60",
            volume: "1L",
            stock: 75
          },
          {
            name: "Castrol GTX Diesel 15W-40",
            description: "Proteção superior para motores diesel de picapes e utilitários.",
            price: 49.90,
            imageUrl: "https://picsum.photos/seed/gtxdiesel/600/600",
            category: "Engine Oil",
            viscosity: "15W-40",
            volume: "1L",
            stock: 130
          },
          {
            name: "Castrol Power 1 Racing 10W-40",
            description: "Óleo 100% sintético para motos de 4 tempos. Tecnologia derivada das pistas.",
            price: 79.90,
            imageUrl: "https://picsum.photos/seed/power1/600/600",
            category: "Motorcycle Oil",
            viscosity: "10W-40",
            volume: "1L",
            stock: 90
          },
          {
            name: "Castrol Power 1 Racing 10W-50",
            description: "Máxima performance e aceleração para motos de alta cilindrada.",
            price: 85.00,
            imageUrl: "https://picsum.photos/seed/power1-10w50/600/600",
            category: "Motorcycle Oil",
            viscosity: "10W-50",
            volume: "1L",
            stock: 70
          },
          {
            name: "Castrol Actevo Stop-Start 4T 10W-30",
            description: "Proteção contínua para motos em trânsito intenso de para-e-anda.",
            price: 65.00,
            imageUrl: "https://picsum.photos/seed/actevo/600/600",
            category: "Motorcycle Oil",
            viscosity: "10W-30",
            volume: "1L",
            stock: 110
          },
          {
            name: "Castrol Transmax CVT",
            description: "Fluido totalmente sintético para transmissões continuamente variáveis.",
            price: 115.00,
            imageUrl: "https://picsum.photos/seed/cvt/600/600",
            category: "Transmission Fluid",
            viscosity: "CVT",
            volume: "1L",
            stock: 45
          },
          {
            name: "Castrol Transmax ATF Dex III",
            description: "Fluido para transmissões automáticas e direções hidráulicas.",
            price: 48.00,
            imageUrl: "https://picsum.photos/seed/transmax/600/600",
            category: "Transmission Fluid",
            viscosity: "ATF",
            volume: "1L",
            stock: 60
          },
          {
            name: "Castrol Transmax Full Synthetic",
            description: "Fluido de transmissão totalmente sintético para máxima proteção.",
            price: 135.00,
            imageUrl: "https://picsum.photos/seed/transfull/600/600",
            category: "Transmission Fluid",
            viscosity: "Full Syn",
            volume: "1L",
            stock: 40
          },
          {
            name: "Castrol CRB Turbomax 15W-40",
            description: "Óleo de motor diesel premium para frotas e veículos comerciais pesados.",
            price: 850.00,
            imageUrl: "https://picsum.photos/seed/crb20l/600/600",
            category: "Heavy Duty",
            viscosity: "15W-40",
            volume: "20L",
            stock: 25
          },
          {
            name: "Castrol CRB Multi 15W-40",
            description: "Proteção versátil para motores diesel de diversas gerações.",
            price: 45.00,
            imageUrl: "https://picsum.photos/seed/crbmulti/600/600",
            category: "Heavy Duty",
            viscosity: "15W-40",
            volume: "1L",
            stock: 150
          },
          {
            name: "Castrol React Performance DOT 4",
            description: "Fluido de freio sintético de alta performance.",
            price: 45.00,
            imageUrl: "https://picsum.photos/seed/dot4/600/600",
            category: "Brake Fluid",
            viscosity: "DOT 4",
            volume: "500ml",
            stock: 100
          },
          {
            name: "Castrol Brake Fluid DOT 3",
            description: "Fluido de freio confiável para sistemas convencionais.",
            price: 32.00,
            imageUrl: "https://picsum.photos/seed/dot3/600/600",
            category: "Brake Fluid",
            viscosity: "DOT 3",
            volume: "500ml",
            stock: 120
          },
          {
            name: "Castrol Chain Spray",
            description: "Lubrificante de alto desempenho para correntes de motocicletas.",
            price: 52.00,
            imageUrl: "https://picsum.photos/seed/chainspray/600/600",
            category: "Maintenance",
            viscosity: "Spray",
            volume: "400ml",
            stock: 150
          },
          {
            name: "Castrol Fork Oil 5W",
            description: "Fluido de suspensão premium para garfos de motocicletas.",
            price: 58.00,
            imageUrl: "https://picsum.photos/seed/forkoil/600/600",
            category: "Maintenance",
            viscosity: "5W",
            volume: "500ml",
            stock: 40
          },
          {
            name: "Castrol 2T Mineral",
            description: "Óleo para motores 2 tempos de roçadeiras, motosserras e motos antigas.",
            price: 28.00,
            imageUrl: "https://picsum.photos/seed/2tmineral/600/600",
            category: "Motorcycle Oil",
            viscosity: "2T",
            volume: "500ml",
            stock: 300
          },
          {
            name: "Castrol Radicool SF",
            description: "Fluido de arrefecimento de longa vida (OAT) para proteção total do sistema.",
            price: 68.00,
            imageUrl: "https://picsum.photos/seed/radicool/600/600",
            category: "Coolant",
            viscosity: "OAT",
            volume: "1L",
            stock: 80
          },
          {
            name: "Castrol LMX Grease",
            description: "Graxa de complexo de lítio de alto desempenho para rolamentos sob extrema pressão.",
            price: 42.00,
            imageUrl: "https://picsum.photos/seed/lmx/600/600",
            category: "Grease",
            viscosity: "NLGI 2",
            volume: "500g",
            stock: 100
          }
        ];
        for (const p of initialProducts) {
          if (!existingNames.includes(p.name)) {
            await addDoc(collection(db, 'products'), p);
          }
        }
    };
    seedProducts();
  }, []);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const clearCart = () => setCart([]);

  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, total }}>
        <Router>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-grow">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/orders" element={<Orders />} />
              </Routes>
            </main>
            <footer className="bg-castrol-dark text-white py-12">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                  <div className="col-span-1 md:col-span-2">
                    <div className="flex items-center gap-2 mb-6">
                      <div className="w-8 h-8 bg-castrol-green rounded flex items-center justify-center">
                        <span className="text-white font-display font-black text-sm italic">C</span>
                      </div>
                      <span className="font-display font-extrabold text-xl tracking-tighter">
                        CASTROL<span className="text-castrol-red">HUB</span>
                      </span>
                    </div>
                    <p className="text-gray-400 max-w-sm">
                      Distribuidor oficial de lubrificantes Castrol. Tecnologia e performance para seu motor.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-bold mb-6">Links Úteis</h4>
                    <ul className="space-y-4 text-gray-400 text-sm">
                      <li><Link to="/" className="hover:text-white transition-colors">Produtos</Link></li>
                      <li><Link to="/orders" className="hover:text-white transition-colors">Meus Pedidos</Link></li>
                      <li><Link to="/cart" className="hover:text-white transition-colors">Carrinho</Link></li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold mb-6">Suporte</h4>
                    <ul className="space-y-4 text-gray-400 text-sm">
                      <li>Central de Ajuda</li>
                      <li>Política de Devolução</li>
                      <li>Termos de Uso</li>
                    </ul>
                  </div>
                </div>
                <div className="border-t border-white/10 mt-12 pt-8 text-center text-gray-500 text-xs">
                  © 2026 Castrol Lubricants Hub. Todos os direitos reservados.
                </div>
              </div>
            </footer>
          </div>
        </Router>
      </CartContext.Provider>
    </AuthContext.Provider>
  );
}
