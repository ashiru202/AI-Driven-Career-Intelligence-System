import * as React from "react"

const Button = React.forwardRef(({ className = "", variant = "default", size = "default", ...props }, ref) => {
  const variants = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    destructive: "bg-red-600 text-white hover:bg-red-700",
    outline: "border border-white/20 bg-transparent hover:bg-white/10 text-gray-100",
    secondary: "bg-white/10 text-gray-100 hover:bg-white/15",
    ghost: "hover:bg-white/10 text-gray-100",
    link: "text-indigo-400 underline-offset-4 hover:underline",
  }

  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-9 px-3",
    lg: "h-11 px-8",
    icon: "h-10 w-10",
  }

  return (
    <button
      className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button }
