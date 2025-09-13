export function ScrollArea({ className="", ...props }){
  return <div className={`overflow-auto ${className}`} {...props} />;
}
export default ScrollArea;
