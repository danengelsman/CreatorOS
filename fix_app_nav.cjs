const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Replace the burger button (we want it visible on all screens, so remove hidden lg:flex)
const burgerOld = `<button 
                 onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
                 className="p-2 -ml-2 hidden lg:flex items-center gap-2 text-[var(--accent)] hover:opacity-80 transition-opacity"
               >
                 {isMobileMenuOpen ? <X size={24} strokeWidth={1.5} /> : <Menu size={24} strokeWidth={1.5} />}
                 <span className="font-bold text-lg hidden sm:block tracking-tight text-[var(--label-primary)]">CreatorOS</span>
               </button>`;
const burgerNew = `<button 
                 onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
                 className="p-2 -ml-2 flex items-center gap-2 text-[var(--accent)] hover:opacity-80 transition-opacity"
               >
                 {isMobileMenuOpen ? <X size={24} strokeWidth={1.5} /> : <Menu size={24} strokeWidth={1.5} />}
                 <span className="font-bold text-lg hidden sm:block tracking-tight text-[var(--label-primary)]">CreatorOS</span>
               </button>`;
code = code.replace(burgerOld, burgerNew);

// Also remove the "Mobile Logo Logo" since the burger now shows on mobile too,
// OR keep it but maybe it looks redundant?
const mobileLogo = `{/* Mobile Logo Logo */}
               <div className="lg:hidden flex items-center gap-2">
                 <BrandIcon size={20} className="text-[var(--accent)]" />
                 <span className="font-bold tracking-tight text-[var(--label-primary)]">CreatorOS</span>
               </div>`;
code = code.replace(mobileLogo, "");

// Add NAV_GROUPS after NAV_ITEMS
const navItemsRegex = /const NAV_ITEMS = \[([\s\S]*?)\];/;
const groupsCode = `\nconst NAV_GROUPS = [
  {
    title: 'Main',
    items: ['home']
  },
  {
    title: 'Studio',
    items: ['create', 'repurpose', 'brand', 'ideas', 'prompts']
  },
  {
    title: 'Growth',
    items: ['hub', 'reports', 'roadmap', 'community']
  },
  {
    title: 'Settings',
    items: ['profile', 'help', 'support']
  }
];`;
code = code.replace(navItemsRegex, match => match + groupsCode);

// Replace the backdrop and motion.nav
const navOld = `<motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/20 z-[60] hidden lg:block"
                  onClick={() => setIsMobileMenuOpen(false)}
                />
                <motion.nav
                  initial={{ opacity: 0, y: -10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="fixed top-[calc(env(safe-area-inset-top,0px)+60px)] left-4 w-80 bg-[var(--bg-secondary)] ios-card shadow-2xl z-[65] max-h-[80vh] overflow-y-auto custom-scrollbar border border-[var(--separator)] hidden lg:block"
                >
                  <div className="p-2 space-y-1">
                    {visibleNavItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (item.locked && !isDeveloper && projects.length === 0) return;
                          setActiveTab(item.id);
                          setIsMobileMenuOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all group",
                          activeTab === item.id 
                            ? "bg-[var(--accent)] text-white shadow-md shadow-[#007AFF1A]" 
                            : "text-[var(--label-secondary)] hover:bg-[var(--separator)]",
                          item.locked && !isDeveloper && projects.length === 0 && "opacity-40 cursor-not-allowed grayscale"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon size={20} className="flex-shrink-0" weight={activeTab === item.id ? "duotone" : "regular"} />
                          <span className="font-semibold text-[15px]">{item.label}</span>
                        </div>
                      </button>
                    ))}
                    
                    <div className="my-2 border-t border-[var(--separator)]" />
                    
                    <button 
                      onClick={() => {
                        logout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-[var(--system-red)] hover:bg-[var(--separator)] transition-colors rounded-xl"
                    >
                      <LogOut size={20} />
                      <span className="text-[15px] font-semibold">Logout</span>
                    </button>
                  </div>
                </motion.nav>`;

const navNew = `<motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/40 lg:bg-black/20 z-[60] backdrop-blur-sm lg:backdrop-blur-none"
                  onClick={() => setIsMobileMenuOpen(false)}
                />
                <motion.nav
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="fixed top-[env(safe-area-inset-top,0px)] left-0 bottom-0 w-[280px] lg:top-[calc(env(safe-area-inset-top,0px)+60px)] lg:left-4 lg:bottom-auto lg:w-80 bg-[var(--bg-secondary)] ios-card shadow-2xl z-[65] max-h-[100dvh] lg:max-h-[80vh] overflow-y-auto custom-scrollbar border-r lg:border border-[var(--separator)]"
                >
                  <div className="p-4 lg:p-2 space-y-6 lg:space-y-4">
                    {/* Mobile Only Header */}
                    <div className="flex lg:hidden items-center justify-between pb-2 border-b border-[var(--separator)]">
                      <div className="flex items-center gap-2 text-[var(--accent)]">
                        <Menu size={24} strokeWidth={1.5} />
                        <span className="font-bold text-lg tracking-tight text-[var(--label-primary)]">CreatorOS</span>
                      </div>
                      <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-[var(--label-secondary)] hover:text-[var(--label-primary)]">
                        <X size={24} />
                      </button>
                    </div>

                    {NAV_GROUPS.map((group, groupIdx) => {
                      const groupItems = group.items.map(id => visibleNavItems.find(item => item.id === id)).filter(Boolean);
                      if (groupItems.length === 0) return null;
                      
                      return (
                        <div key={groupIdx} className="space-y-1">
                          {group.title !== 'Main' && (
                            <h4 className="px-4 py-2 text-[12px] font-bold tracking-wider text-[var(--label-tertiary)] uppercase">
                              {group.title}
                            </h4>
                          )}
                          {groupItems.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => {
                                if (item.locked && !isDeveloper && projects.length === 0) return;
                                setActiveTab(item.id);
                                setIsMobileMenuOpen(false);
                              }}
                              className={cn(
                                "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all group",
                                activeTab === item.id 
                                  ? "bg-[var(--accent)] text-white shadow-md shadow-[#007AFF1A]" 
                                  : "text-[var(--label-secondary)] hover:bg-[var(--separator)]",
                                item.locked && !isDeveloper && projects.length === 0 && "opacity-40 cursor-not-allowed grayscale"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <item.icon size={20} className="flex-shrink-0" weight={activeTab === item.id ? "duotone" : "regular"} />
                                <span className="font-semibold text-[15px]">{item.label}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      );
                    })}
                    
                    <div className="my-4 border-t border-[var(--separator)]" />
                    
                    <button 
                      onClick={() => {
                        logout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-[var(--system-red)] hover:bg-[var(--separator)] transition-colors rounded-xl mb-8 lg:mb-0"
                    >
                      <LogOut size={20} />
                      <span className="text-[15px] font-semibold">Logout</span>
                    </button>
                  </div>
                </motion.nav>`;

code = code.replace(navOld, navNew);

fs.writeFileSync('src/App.tsx', code);
