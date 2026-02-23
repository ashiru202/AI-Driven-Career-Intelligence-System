import * as React from "react"

const Badge = React.forwardRef(({ className = "", variant = "default", ...props }, ref) => {
  const variants = {
    default: "bg-blue-500 text-white hover:bg-blue-600",
    success: "bg-green-500 text-white hover:bg-green-600",
    destructive: "bg-red-500 text-white hover:bg-red-600",
    outline: "border border-white/20 text-gray-200 hover:bg-white/10",
    secondary: "bg-gray-500 text-white hover:bg-gray-600",
  }

  return (
    <div
      ref={ref}
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${variants[variant]} ${className}`}
      {...props}
    />
  )
})
Badge.displayName = "Badge"

export { Badge }
