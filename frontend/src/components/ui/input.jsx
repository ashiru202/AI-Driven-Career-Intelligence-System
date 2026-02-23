import * as React from "react"

const Input = React.forwardRef(({ className = "", type = "text", ...props }, ref) => {
  return (
    <input
      type={type}
      className={`flex h-10 w-full rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.13)', color: '#fff' }}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = "Input"

const Label = React.forwardRef(({ className = "", ...props }, ref) => (
  <label
    ref={ref}
    className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}
    style={{ color: 'rgba(255,255,255,0.75)' }}
    {...props}
  />
))
Label.displayName = "Label"

export { Input, Label }
