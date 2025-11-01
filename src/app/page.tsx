'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHome, 
  faChartLine, 
  faFileContract, 
  faTools, 
  faShieldAlt,
  faCheckCircle,
  faUsers,
  faBuilding,
  faClock,
  faStar
} from '@fortawesome/free-solid-svg-icons';

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1E4E6B' }}>
                <FontAwesomeIcon icon={faHome} className="text-white text-xl" />
              </div>
              <span className="text-2xl font-bold" style={{ color: '#1E4E6B' }}>NxtLevel</span>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <a href="#how-it-works" className="text-[#64748b] hover:text-[#1E4E6B] transition-colors">How It Works</a>
              <a href="#features" className="text-[#64748b] hover:text-[#1E4E6B] transition-colors">Features</a>
              <a href="#pricing" className="text-[#64748b] hover:text-[#1E4E6B] transition-colors">Pricing</a>
              <a href="/manager" className="text-[#64748b] hover:text-[#1E4E6B] transition-colors font-semibold">Owner Dashboard</a>
              <a href="/maintenance" className="text-[#64748b] hover:text-[#1E4E6B] transition-colors">Tenant Portal</a>
              <a href="#resources" className="text-[#64748b] hover:text-[#1E4E6B] transition-colors">Resources</a>
            </div>

            <div className="flex items-center space-x-4">
              <button className="text-[#64748b] hover:text-[#1E4E6B] transition-colors font-medium">
                Sign In
              </button>
              <button className="px-6 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity" style={{ backgroundColor: '#A4C639' }}>
                TRY FOR FREE
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="py-20" style={{ background: 'linear-gradient(135deg, #f0f4f8 0%, #e8f2f6 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-8">
            <p className="text-sm font-semibold tracking-wider mb-4" style={{ color: '#64748b' }}>PROPERTY MANAGEMENT SOFTWARE AND SERVICE</p>
            <h1 className="text-5xl md:text-6xl font-bold mb-6" style={{ color: '#1E4E6B' }}>
              Trusted property management, powered by people and AI.
            </h1>
            <p className="text-xl md:text-2xl mb-8" style={{ color: '#2d3748' }}>
              Automate leasing, rent, and maintenance with real experts to back you up.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <button className="px-8 py-4 rounded-lg text-white font-semibold text-lg hover:opacity-90 transition-opacity shadow-lg" style={{ backgroundColor: '#A4C639' }}>
              TRY FOR FREE
            </button>
            <button className="px-8 py-4 rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity border-2 bg-white" style={{ borderColor: '#1E4E6B', color: '#1E4E6B' }}>
              Book a Demo
            </button>
          </div>

          <div className="flex items-center justify-center gap-6 flex-wrap">
            <span className="text-sm" style={{ color: '#64748b' }}>Rated By</span>
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faStar} style={{ color: '#A4C639' }} />
              <span className="font-semibold" style={{ color: '#2d3748' }}>Capterra</span>
            </div>
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faStar} style={{ color: '#A4C639' }} />
              <span className="font-semibold" style={{ color: '#2d3748' }}>Software Advice</span>
            </div>
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faStar} style={{ color: '#A4C639' }} />
              <span className="font-semibold" style={{ color: '#2d3748' }}>GetApp</span>
            </div>
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faStar} style={{ color: '#A4C639' }} />
              <span className="font-semibold" style={{ color: '#2d3748' }}>G2</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Overview */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: '#1E4E6B' }}>
              Your long-term rentals, under control.
            </h2>
            <p className="text-xl" style={{ color: '#64748b' }}>All of the control, none of the chaos.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: '#f0f4f8' }}>
                <FontAwesomeIcon icon={faHome} className="text-3xl" style={{ color: '#1E4E6B' }} />
              </div>
              <h3 className="text-2xl font-bold mb-4" style={{ color: '#1E4E6B' }}>Tenant Placement</h3>
              <p className="mb-4" style={{ color: '#64748b' }}>
                Find a qualified tenant in under 19 days through 15+ listing sites, in-depth tenant screening, and guided tours.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faCheckCircle} style={{ color: '#A4C639' }} />
                  <span style={{ color: '#2d3748' }}>Property Listing</span>
                </li>
                <li className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faCheckCircle} style={{ color: '#A4C639' }} />
                  <span style={{ color: '#2d3748' }}>E-sign</span>
                </li>
              </ul>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: '#f0f4f8' }}>
                <FontAwesomeIcon icon={faChartLine} className="text-3xl" style={{ color: '#1E4E6B' }} />
              </div>
              <h3 className="text-2xl font-bold mb-4" style={{ color: '#1E4E6B' }}>Financials</h3>
              <p className="mb-4" style={{ color: '#64748b' }}>
                Rent goes directly into your bank account, including the late fees. Sync your bank account for real-time performance.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faCheckCircle} style={{ color: '#A4C639' }} />
                  <span style={{ color: '#2d3748' }}>Automate rent collection</span>
                </li>
                <li className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faCheckCircle} style={{ color: '#A4C639' }} />
                  <span style={{ color: '#2d3748' }}>100% funds to you</span>
                </li>
              </ul>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: '#f0f4f8' }}>
                <FontAwesomeIcon icon={faFileContract} className="text-3xl" style={{ color: '#1E4E6B' }} />
              </div>
              <h3 className="text-2xl font-bold mb-4" style={{ color: '#1E4E6B' }}>Lease Management</h3>
              <p className="mb-4" style={{ color: '#64748b' }}>
                In app leases, messaging with tenants (SMS and email), and streamlined e-signing with a coordinator available.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faCheckCircle} style={{ color: '#A4C639' }} />
                  <span style={{ color: '#2d3748' }}>Digital signatures</span>
                </li>
                <li className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faCheckCircle} style={{ color: '#A4C639' }} />
                  <span style={{ color: '#2d3748' }}>Tenant messaging</span>
                </li>
              </ul>
            </div>

            {/* Feature 4 */}
            <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: '#f0f4f8' }}>
                <FontAwesomeIcon icon={faTools} className="text-3xl" style={{ color: '#1E4E6B' }} />
              </div>
              <h3 className="text-2xl font-bold mb-4" style={{ color: '#1E4E6B' }}>Maintenance & Repair</h3>
              <p className="mb-4" style={{ color: '#64748b' }}>
                Repairs handled smoothly with 24/7 coordination for tenant requests and emergencies.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faCheckCircle} style={{ color: '#A4C639' }} />
                  <span style={{ color: '#2d3748' }}>24/7 Repair coordination</span>
                </li>
                <li className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faCheckCircle} style={{ color: '#A4C639' }} />
                  <span style={{ color: '#2d3748' }}>Emergency support</span>
                </li>
              </ul>
            </div>

            {/* Feature 5 */}
            <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: '#f0f4f8' }}>
                <FontAwesomeIcon icon={faShieldAlt} className="text-3xl" style={{ color: '#1E4E6B' }} />
              </div>
              <h3 className="text-2xl font-bold mb-4" style={{ color: '#1E4E6B' }}>Eviction Shield</h3>
              <p className="mb-4" style={{ color: '#64748b' }}>
                Protection against evictions with mediators and process servers, with 93% of cases avoiding the courtroom.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faCheckCircle} style={{ color: '#A4C639' }} />
                  <span style={{ color: '#2d3748' }}>Legal protection</span>
                </li>
                <li className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faCheckCircle} style={{ color: '#A4C639' }} />
                  <span style={{ color: '#2d3748' }}>Mediation services</span>
                </li>
              </ul>
            </div>

            {/* Feature 6 - Stats */}
            <div className="rounded-xl p-8 shadow-lg" style={{ background: 'linear-gradient(135deg, #1E4E6B 0%, #2a6685 100%)' }}>
              <h3 className="text-3xl font-bold mb-4 text-white">Manage from anywhere</h3>
              <div className="space-y-6">
                <div>
                  <div className="text-4xl font-bold mb-2" style={{ color: '#A4C639' }}>100%</div>
                  <p className="text-white">funds go to you (even late fees)</p>
                </div>
                <div>
                  <div className="text-4xl font-bold mb-2" style={{ color: '#A4C639' }}>70%</div>
                  <p className="text-white">time savings through automation</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Property Types */}
      <section className="py-20" style={{ background: 'linear-gradient(135deg, #f0f4f8 0%, #e8f2f6 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-12" style={{ color: '#1E4E6B' }}>
            Built for every type of rental property
          </h2>
          
          <div className="grid md:grid-cols-5 gap-6">
            {['Affordable Housing', 'Single-Family Rentals', 'Multi-Family Rentals', 'Rent By Room', 'Student Housing'].map((type, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#f0f4f8' }}>
                  <FontAwesomeIcon icon={faBuilding} className="text-2xl" style={{ color: '#1E4E6B' }} />
                </div>
                <h3 className="font-semibold" style={{ color: '#2d3748' }}>{type}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* User Roles Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: '#1E4E6B' }}>
              Whatever your role, we make rentals work for you
            </h2>
            <p className="text-xl" style={{ color: '#64748b' }}>
              See how NxtLevel helps you manage smarter—no matter where you fit in.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { title: 'Rental Owners', desc: 'Self-manage your rentals from anywhere. Find better tenants, automate the day-to-day, and get help when you need it.' },
              { title: 'Real Estate Agents', desc: 'Support your clients with more than sales. Offer added value with leasing services, repairs, and rental oversight.' },
              { title: 'Property Managers', desc: 'Grow your portfolio with the right software and services. Use NxtLevel to streamline operations and serve owners.' },
              { title: 'Tenants', desc: 'Renting feels better when it\'s easy. From applying to paying rent and requesting repairs, everything in one place.' }
            ].map((role, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow border-2" style={{ borderColor: '#e8f2f6' }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#f0f4f8' }}>
                  <FontAwesomeIcon icon={faUsers} className="text-2xl" style={{ color: '#1E4E6B' }} />
                </div>
                <h3 className="text-xl font-bold mb-3" style={{ color: '#1E4E6B' }}>{role.title}</h3>
                <p className="mb-4" style={{ color: '#64748b' }}>{role.desc}</p>
                <a href="#" className="font-semibold hover:underline" style={{ color: '#A4C639' }}>Learn more →</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-20" style={{ background: 'linear-gradient(135deg, #1E4E6B 0%, #2a6685 100%)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-6">
            {[...Array(5)].map((_, i) => (
              <FontAwesomeIcon key={i} icon={faStar} className="text-2xl mx-1" style={{ color: '#A4C639' }} />
            ))}
          </div>
          <blockquote className="text-2xl md:text-3xl font-medium text-white mb-6">
            "The best property management software for real-estate investors and entrepreneurs! I travel a lot for business, and I can manage my units from anywhere in the world."
          </blockquote>
          <p className="text-lg" style={{ color: '#A4C639' }}>
            Julian S. - 4 rentals in Denver, CO
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: '#1E4E6B' }}>
              All-in-one platform
            </h2>
            <p className="text-xl" style={{ color: '#64748b' }}>
              A platform that scales with you, providing the tools and support you need at every stage.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            {[
              { icon: faHome, title: 'Leasing Tools', desc: 'Find and place a qualified tenant faster' },
              { icon: faUsers, title: 'Local Support', desc: 'Connect with licensed agents to place a tenant for you' },
              { icon: faClock, title: 'Repair Coordination', desc: '24/7 US-based team for tenant requests' },
              { icon: faTools, title: 'Management Tools', desc: 'Making the day-to-day easier through automation' }
            ].map((item, index) => (
              <div key={index} className="text-center p-6">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#f0f4f8' }}>
                  <FontAwesomeIcon icon={item.icon} className="text-3xl" style={{ color: '#1E4E6B' }} />
                </div>
                <h3 className="text-xl font-bold mb-2" style={{ color: '#1E4E6B' }}>{item.title}</h3>
                <p style={{ color: '#64748b' }}>{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="px-8 py-4 rounded-lg text-white font-semibold text-lg hover:opacity-90 transition-opacity shadow-lg" style={{ backgroundColor: '#A4C639' }}>
              Get started for free
            </button>
            <button className="px-8 py-4 rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity border-2 bg-white" style={{ borderColor: '#1E4E6B', color: '#1E4E6B' }}>
              BOOK A DEMO
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16" style={{ backgroundColor: '#1E4E6B' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <h4 className="text-white font-bold mb-4">How It Works</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Watch Demo</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">For Owners</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">For Agents</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">For Managers</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">For Tenants</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-4">Product</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Rental Advertising</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Tenant Screening</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Lease Management</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Online Rent</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-4">About</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Locations</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Contact Us</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-4">Resources</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Support</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Academy</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Blog</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-600 pt-8 text-center">
            <p className="text-gray-300 text-sm">
              NxtLevel Rental Manager © 2025 | Privacy Policy | Terms of Use
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
