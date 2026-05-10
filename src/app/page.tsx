import Link from "next/link";
import { ArrowRight, CheckCircle2, Zap, Globe, Smartphone } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl">
            L
          </div>
          <span className="text-2xl font-bold tracking-tight">LinkBio</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/sign-in" className="font-semibold text-slate-600 hover:text-primary transition-colors">
            Login
          </Link>
          <Link 
            href="/sign-up" 
            className="bg-primary text-white px-6 py-2.5 rounded-full font-bold hover:shadow-lg transition-all"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-8 pt-20 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full mb-6 text-sm font-bold text-primary">
              <Zap className="w-4 h-4 fill-primary" />
              <span>Version 1.0 is now live</span>
            </div>
            <h1 className="text-6xl lg:text-7xl font-extrabold leading-[1.1] mb-8">
              Everything you are <span className="text-primary">in one link.</span>
            </h1>
            <p className="text-xl text-slate-500 mb-10 max-w-lg leading-relaxed">
              Create a beautiful, premium link-in-bio page for your social profiles. 
              Track clicks, manage links, and customize your theme in seconds.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                href="/sign-up" 
                className="bg-primary text-white px-8 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-xl shadow-primary/20"
              >
                Create your LinkBio <ArrowRight className="w-5 h-5" />
              </Link>
              <Link 
                href="/demo" 
                className="bg-white border-2 border-slate-200 text-slate-700 px-8 py-4 rounded-2xl font-bold text-lg flex items-center justify-center hover:bg-slate-50 transition-colors"
              >
                View Examples
              </Link>
            </div>
            
            <div className="mt-12 flex items-center gap-6 text-slate-400">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4 text-green-500" /> No credit card required
              </div>
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4 text-green-500" /> Free forever plan
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-tr from-primary/20 to-purple-500/20 blur-3xl rounded-full" />
            <div className="relative bg-slate-900 rounded-[3rem] p-4 shadow-2xl border-8 border-slate-800 max-w-[320px] mx-auto overflow-hidden">
              {/* Mock Phone Content */}
              <div className="bg-slate-50 h-[560px] rounded-[2rem] overflow-hidden flex flex-col items-center py-10 px-6">
                <div className="w-16 h-16 bg-primary rounded-full mb-4 shadow-lg" />
                <div className="w-24 h-4 bg-slate-200 rounded-full mb-2" />
                <div className="w-32 h-3 bg-slate-100 rounded-full mb-10" />
                
                <div className="w-full space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-full h-12 bg-white rounded-xl shadow-sm border border-slate-100" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Features */}
      <section className="bg-slate-50 py-24 border-t">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Built for Creators</h2>
            <p className="text-slate-500 text-lg">Simple powerful tools to grow your online presence</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Mobile First</h3>
              <p className="text-slate-500">Optimized for social media platforms where your audience lives.</p>
            </div>
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Fast Setup</h3>
              <p className="text-slate-500">Go live in under 60 seconds with our intuitive dashboard.</p>
            </div>
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mb-6">
                <Globe className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">SEO Ready</h3>
              <p className="text-slate-500">Custom meta tags and social previews for maximum visibility.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
