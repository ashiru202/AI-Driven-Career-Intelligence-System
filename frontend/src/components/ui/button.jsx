import * as React from "react"

const Button = React.forwardRef(({ className = "", variant = "default", size = "default", ...props }, ref) => {
  const sharedGradient = "border border-[#9a90ff]/45 bg-gradient-to-r from-[#7a6cff] to-[#5f54f7] text-white shadow-[0_10px_24px_rgba(95,84,247,0.35)] hover:from-[#8678ff] hover:to-[#6a5fff] hover:shadow-[0_14px_28px_rgba(95,84,247,0.45)]"

  const variants = {
    default: sharedGradient,
    destructive: sharedGradient,
    outline: sharedGradient,
    secondary: sharedGradient,
    ghost: sharedGradient,
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
      className={`inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9f96ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07071a] disabled:opacity-55 disabled:pointer-events-none disabled:shadow-none ${variants[variant]} ${sizes[size]} ${className}`}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button }
