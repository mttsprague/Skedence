'use client'

export default function DesignIndex() {
  const designs = [
    {
      id: 1,
      title: 'Design 1: Hero Video',
      description: 'Modern card-based layout with video hero section',
      route: '/',
      color: 'from-pva-teal to-pva-green'
    },
    {
      id: 2,
      title: 'Design 2: Split Screen',
      description: 'Bold split-screen design with dark theme',
      route: '/design2',
      color: 'from-pva-orange to-pva-orange/80'
    },
    {
      id: 3,
      title: 'Design 3: Minimalist',
      description: 'Clean, gradient-focused minimalist design',
      route: '/design3',
      color: 'from-pva-navy to-pva-teal'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6">
      <div className="max-w-5xl w-full">
        <div className="text-center mb-16">
          <div className="text-5xl font-black mb-4">
            <span className="text-pva-navy">POLY</span>
            <span className="text-pva-teal">FACE</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-3">
            Website Design Mockups
          </h1>
          <p className="text-gray-600">
            Click on any design to view the full mockup
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {designs.map((design) => (
            <a
              key={design.id}
              href={design.route}
              className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-2 border-transparent hover:border-pva-teal"
            >
              <div className={`w-full h-48 bg-gradient-to-br ${design.color} rounded-xl mb-6 flex items-center justify-center group-hover:scale-105 transition`}>
                <span className="text-white text-6xl font-black">{design.id}</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">{design.title}</h3>
              <p className="text-gray-600 text-sm mb-4">{design.description}</p>
              <div className="flex items-center text-pva-teal font-semibold group-hover:translate-x-2 transition">
                View Design
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </a>
          ))}
        </div>

        <div className="mt-12 p-6 bg-white rounded-xl shadow-md">
          <h3 className="font-bold text-lg mb-3 text-gray-800">Color Scheme</h3>
          <div className="grid grid-cols-5 gap-4">
            {[
              { name: 'Navy', hex: '#14244E', css: 'bg-pva-navy' },
              { name: 'Teal', hex: '#4DA6B0', css: 'bg-pva-teal' },
              { name: 'Green', hex: '#6EBC45', css: 'bg-pva-green' },
              { name: 'Orange', hex: '#E89D32', css: 'bg-pva-orange' },
              { name: 'Light Blue', hex: '#86C5D9', css: 'bg-pva-light-blue' }
            ].map((color) => (
              <div key={color.name} className="text-center">
                <div className={`${color.css} w-full h-16 rounded-lg mb-2 shadow-md`}></div>
                <div className="text-xs font-semibold text-gray-700">{color.name}</div>
                <div className="text-xs text-gray-500">{color.hex}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
