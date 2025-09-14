import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { 
  ShoppingCartIcon,
  HeartIcon,
  TruckIcon,
  ShieldCheckIcon,
  ClockIcon,
  StarIcon,
  ArrowRightIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  TagIcon,
  UserGroupIcon,
  CheckCircleIcon,
  PlayIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { DarkModeContext } from '../app/DarkModeContext';

function Home() {
  const { user, isAuthenticated } = useSelector(state => state.auth);
  const { isDarkMode } = useContext(DarkModeContext);
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [mounted, setMounted] = useState(false);

  // Mount animation
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-rotate hero slides
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const heroSlides = [
    {
      title: "Improving Health With Best Medicine",
      subtitle: "Your trusted healthcare partner providing quality medicines and expert pharmaceutical care",
      image: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      cta: "Shop Now",
      highlight: "24/7 Service"
    },
    {
      title: "Expert Pharmaceutical Care",
      subtitle: "Professional consultations and personalized medication management for your health",
      image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      cta: "Consult Now",
      highlight: "Licensed Pharmacists"
    },
    {
      title: "Fast & Reliable Delivery",
      subtitle: "Get your medications delivered safely to your door with our express delivery service",
      image: "https://images.unsplash.com/photo-1583947215259-38e31be8751f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      cta: "Order Now",
      highlight: "Same Day Delivery"
    }
  ];

  const categories = [
    { name: "Prescription", icon: "💊", color: "bg-blue-500", count: "2000+" },
    { name: "Over Counter", icon: "🏥", color: "bg-green-500", count: "1500+" },
    { name: "Baby Care", icon: "👶", color: "bg-pink-500", count: "800+" },
    { name: "Personal Care", icon: "🧴", color: "bg-purple-500", count: "1200+" },
    { name: "Health Care", icon: "❤️", color: "bg-red-500", count: "900+" },
    { name: "Sports", icon: "⚽", color: "bg-orange-500", count: "600+" }
  ];

  const trendingProducts = [
    {
      id: 1,
      name: "Paracetamol 500mg",
      price: 12.99,
      originalPrice: 15.99,
      image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
      rating: 4.8,
      discount: 20,
      inStock: true,
      prescription: true
    },
    {
      id: 2,
      name: "Vitamin D3 Tablets",
      price: 8.99,
      originalPrice: 11.99,
      image: "https://images.unsplash.com/photo-1550572017-6d61eed1a74f?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
      rating: 4.9,
      discount: 25,
      inStock: true,
      prescription: false
    },
    {
      id: 3,
      name: "Digital Thermometer",
      price: 24.99,
      originalPrice: 29.99,
      image: "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
      rating: 4.7,
      discount: 15,
      inStock: true,
      prescription: false
    },
    {
      id: 4,
      name: "Blood Pressure Monitor",
      price: 89.99,
      originalPrice: 109.99,
      image: "https://images.unsplash.com/photo-1576671081837-49000212a370?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
      rating: 4.6,
      discount: 18,
      inStock: false,
      prescription: false
    }
  ];

  const services = [
    {
      icon: TruckIcon,
      title: "Free Delivery",
      description: "Free delivery on orders over $50",
      color: "text-green-600"
    },
    {
      icon: ClockIcon,
      title: "24/7 Support",
      description: "Round the clock customer service",
      color: "text-blue-600"
    },
    {
      icon: ShieldCheckIcon,
      title: "Secure Payment",
      description: "100% secure payment processing",
      color: "text-purple-600"
    },
    {
      icon: HeartIcon,
      title: "Health Tracking",
      description: "Monitor your health journey",
      color: "text-red-600"
    }
  ];

  const ProductCard = ({ product }) => (
    <div className="group bg-white/90 dark:bg-gray-800/90 rounded-3xl shadow-xl dark:shadow-2xl hover:shadow-2xl dark:hover:shadow-3xl transition-all duration-500 overflow-hidden border border-gray-100/50 dark:border-gray-700/50 backdrop-blur-sm transform hover:-translate-y-2">
      <div className="relative overflow-hidden">
        <img 
          src={product.image} 
          alt={product.name}
          className="w-full h-56 object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        {product.discount > 0 && (
          <div className="absolute top-4 left-4 bg-gradient-to-r from-red-500 to-pink-600 text-white text-xs font-bold px-3 py-2 rounded-full shadow-lg">
            -{product.discount}%
          </div>
        )}
        {product.prescription && (
          <div className="absolute top-4 right-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-bold px-3 py-2 rounded-full shadow-lg">
            Rx
          </div>
        )}
        <button className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/95 dark:bg-gray-800/95 p-4 rounded-full shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-125 backdrop-blur-sm border border-gray-100 dark:border-gray-700">
          <ShoppingCartIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
        </button>
      </div>
      
      <div className="p-6">
        <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-3 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-tight">
          {product.name}
        </h3>
        
        <div className="flex items-center space-x-1 mb-4">
          {[...Array(5)].map((_, i) => (
            <StarIcon 
              key={i} 
              className={`h-4 w-4 ${i < Math.floor(product.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300 dark:text-gray-600'}`} 
            />
          ))}
          <span className="text-sm text-gray-500 dark:text-gray-400 ml-2 font-medium">({product.rating})</span>
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold text-gray-900 dark:text-white">${product.price}</span>
            {product.originalPrice > product.price && (
              <span className="text-sm text-gray-500 dark:text-gray-400 line-through">${product.originalPrice}</span>
            )}
          </div>
          <div className={`text-xs px-3 py-1.5 rounded-full font-medium ${product.inStock ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'}`}>
            {product.inStock ? 'In Stock' : 'Out of Stock'}
          </div>
        </div>
        
        <button 
          disabled={!product.inStock}
          className="w-full py-3 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-700 text-white font-semibold rounded-2xl hover:from-emerald-600 hover:to-teal-700 dark:hover:from-emerald-700 dark:hover:to-teal-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 shadow-lg hover:shadow-xl disabled:hover:scale-100"
        >
          {product.inStock ? 'Add to Cart' : 'Notify Me'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-gray-900 dark:to-black transition-colors duration-500">
      {/* Hero Section */}
      <section className="relative h-[600px] bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 dark:from-emerald-900 dark:via-teal-900 dark:to-cyan-900 overflow-hidden">
        <div className="absolute inset-0 bg-black/10 dark:bg-black/40"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center w-full">
            <div className="text-white space-y-6">
              <div className="inline-flex items-center space-x-2 bg-white/20 dark:bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
                <CheckCircleIcon className="h-5 w-5" />
                <span className="text-sm font-medium">{heroSlides[currentSlide].highlight}</span>
              </div>
              
              <h1 className="text-4xl lg:text-6xl font-bold leading-tight drop-shadow-lg">
                {heroSlides[currentSlide].title}
              </h1>
              
              <p className="text-xl text-white/90 leading-relaxed drop-shadow-md">
                {heroSlides[currentSlide].subtitle}
              </p>
              
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <button className="bg-white dark:bg-white text-emerald-600 dark:text-emerald-700 px-8 py-4 rounded-2xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-100 transition-all duration-200 transform hover:scale-105 shadow-xl hover:shadow-2xl">
                  {heroSlides[currentSlide].cta}
                </button>
                <button className="flex items-center space-x-2 border-2 border-white text-white px-8 py-4 rounded-2xl font-semibold hover:bg-white/20 dark:hover:bg-white/10 transition-all duration-200 backdrop-blur-sm">
                  <PlayIcon className="h-5 w-5" />
                  <span>Watch Video</span>
                </button>
              </div>
            </div>
            
            <div className="hidden lg:block">
              <img 
                src={heroSlides[currentSlide].image}
                alt="Healthcare"
                className="w-full h-96 object-cover rounded-3xl shadow-2xl border-4 border-white/20 dark:border-white/10"
              />
            </div>
          </div>
        </div>
        
        {/* Slide indicators */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-3">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentSlide ? 'bg-white scale-125' : 'bg-white/50 hover:bg-white/75'
              }`}
            />
          ))}
        </div>
      </section>

      {/* Search & Quick Actions */}
      <section className="bg-white/80 dark:bg-gray-800/90 shadow-xl dark:shadow-2xl -mt-12 relative z-10 backdrop-blur-lg border-t border-white/20 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white/90 dark:bg-gray-900/90 rounded-3xl shadow-xl dark:shadow-2xl p-8 border border-gray-100/50 dark:border-gray-700/50 backdrop-blur-sm">
            <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-6">
              <div className="flex-1">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search for medicines, health products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50/80 dark:bg-gray-800/80 border-2 border-gray-200/50 dark:border-gray-600/50 rounded-2xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900/50 focus:border-emerald-500 dark:focus:border-emerald-400 focus:outline-none transition-all duration-200 backdrop-blur-sm"
                  />
                </div>
              </div>
              
              <div className="flex space-x-4">
                <button 
                  onClick={() => navigate('/medicines')}
                  className="flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-indigo-600 dark:from-purple-600 dark:to-indigo-700 text-white px-8 py-4 rounded-2xl hover:from-purple-600 hover:to-indigo-700 dark:hover:from-purple-700 dark:hover:to-indigo-800 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium">AI Medicine Search</span>
                </button>
                <button className="flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-700 text-white px-8 py-4 rounded-2xl hover:from-emerald-600 hover:to-teal-700 dark:hover:from-emerald-700 dark:hover:to-teal-800 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl">
                  <MagnifyingGlassIcon className="h-5 w-5" />
                  <span className="font-medium">Search</span>
                </button>
                <button className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-cyan-600 dark:from-blue-600 dark:to-cyan-700 text-white px-8 py-4 rounded-2xl hover:from-blue-600 hover:to-cyan-700 dark:hover:from-blue-700 dark:hover:to-cyan-800 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl">
                  <ChatBubbleLeftRightIcon className="h-5 w-5" />
                  <span className="font-medium">Consult</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-16 bg-gradient-to-br from-gray-50/50 via-blue-50/30 to-indigo-50/50 dark:from-gray-900/50 dark:via-gray-800/30 dark:to-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {services.map((service, index) => (
              <div key={index} className="bg-white/90 dark:bg-gray-800/90 rounded-3xl p-8 shadow-lg dark:shadow-2xl hover:shadow-2xl dark:hover:shadow-3xl transition-all duration-300 text-center group border border-gray-100/50 dark:border-gray-700/50 backdrop-blur-sm hover:-translate-y-2">
                <div className={`inline-flex p-4 rounded-3xl ${service.color.replace('text-', 'bg-').replace('600', '100')} dark:${service.color.replace('text-', 'bg-').replace('600', '900/50')} mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <service.icon className={`h-8 w-8 ${service.color} dark:${service.color.replace('600', '400')}`} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{service.title}</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
              Product Categories
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Browse our comprehensive range of healthcare products and medicines
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
            {categories.map((category, index) => (
              <Link
                key={index}
                to={`/category/${category.name.toLowerCase().replace(' ', '-')}`}
                className="group bg-gradient-to-br from-white via-gray-50 to-blue-50/50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900 rounded-3xl p-8 text-center hover:shadow-2xl dark:hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-4 border border-gray-100/50 dark:border-gray-700/50 backdrop-blur-sm"
              >
                <div className={`w-20 h-20 ${category.color} dark:${category.color.replace('bg-', 'bg-').replace('500', '600')} rounded-3xl flex items-center justify-center text-3xl mx-auto mb-6 group-hover:scale-125 transition-all duration-300 shadow-lg group-hover:shadow-xl`}>
                  {category.icon}
                </div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {category.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{category.count} items</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Products */}
      <section className="py-20 bg-gradient-to-br from-slate-50/80 via-blue-50/50 to-indigo-50/80 dark:from-slate-900/80 dark:via-gray-900/50 dark:to-black/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-16">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
                Trending Products
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                Popular items our customers love
              </p>
            </div>
            <Link 
              to="/products"
              className="flex items-center space-x-3 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold group bg-white/80 dark:bg-gray-800/80 px-6 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm border border-blue-100 dark:border-blue-800/50"
            >
              <span>View All</span>
              <ArrowRightIcon className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {trendingProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter & Contact */}
      <section className="py-20 bg-gradient-to-r from-emerald-600 via-teal-700 to-cyan-700 dark:from-emerald-900 dark:via-teal-900 dark:to-cyan-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10 dark:bg-black/30"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-white/10 dark:via-white/5 dark:to-white/5"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="text-white">
              <h2 className="text-4xl font-bold mb-6 drop-shadow-lg">Stay Updated with Health Tips</h2>
              <p className="text-xl text-white/90 mb-8 leading-relaxed drop-shadow-md">
                Get the latest health news, medication reminders, and exclusive offers delivered to your inbox.
              </p>
              
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-6 py-4 rounded-2xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-white/30 backdrop-blur-sm bg-white/90 dark:bg-white/95 border border-white/20 shadow-lg"
                />
                <button className="bg-white dark:bg-white text-emerald-600 dark:text-emerald-700 px-8 py-4 rounded-2xl font-bold hover:bg-gray-50 dark:hover:bg-gray-100 transition-all duration-200 transform hover:scale-105 shadow-xl hover:shadow-2xl">
                  Subscribe
                </button>
              </div>
            </div>
            
            <div className="text-white">
              <h3 className="text-3xl font-bold mb-8 drop-shadow-lg">Need Help?</h3>
              <div className="space-y-6">
                <div className="flex items-center space-x-6 bg-white/10 dark:bg-white/5 rounded-2xl p-6 backdrop-blur-sm border border-white/20 hover:bg-white/20 dark:hover:bg-white/10 transition-all duration-300">
                  <div className="w-16 h-16 bg-white/20 dark:bg-white/10 rounded-2xl flex items-center justify-center">
                    <PhoneIcon className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">24/7 Hotline</p>
                    <p className="text-white/80 text-lg">1-800-PHARMACY</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-6 bg-white/10 dark:bg-white/5 rounded-2xl p-6 backdrop-blur-sm border border-white/20 hover:bg-white/20 dark:hover:bg-white/10 transition-all duration-300">
                  <div className="w-16 h-16 bg-white/20 dark:bg-white/10 rounded-2xl flex items-center justify-center">
                    <ChatBubbleLeftRightIcon className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">Live Chat</p>
                    <p className="text-white/80 text-lg">Available 24/7</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
