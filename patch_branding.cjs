const fs = require('fs');
let content = fs.readFileSync('src/components/BrandingEngine.tsx', 'utf8');

const targetStr = `          <section className="space-y-5">
            <h3 className="text-[22px] font-semibold tracking-tight px-2 flex items-center gap-2">
              <MessageSquare size={24} className="text-[var(--accent)]" /> Writing & Tone
            </h3>`;

const insertStr = `          {brand.avatar && (
            <section className="space-y-5 md:col-span-2">
              <h3 className="text-[22px] font-semibold tracking-tight px-2 flex items-center gap-2">
                <Target size={24} className="text-[var(--accent)]" /> AI Avatar Profile
              </h3>
              <div className="bg-[var(--bg-tertiary)] rounded-[28px] overflow-hidden divide-y divide-[var(--separator)] border border-[var(--separator)] shadow-sm">
                 <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="flex flex-col gap-2">
                      <span className="text-[13px] font-semibold tracking-wider uppercase text-[var(--label-tertiary)]">Gender</span>
                      <span className="text-[17px] font-medium">{brand.avatar.gender}</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-[13px] font-semibold tracking-wider uppercase text-[var(--label-tertiary)]">Clothing</span>
                      <span className="text-[17px] font-medium">{brand.avatar.clothing}</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-[13px] font-semibold tracking-wider uppercase text-[var(--label-tertiary)]">Sound & Voice</span>
                      <span className="text-[17px] font-medium">{brand.avatar.sound}</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-[13px] font-semibold tracking-wider uppercase text-[var(--label-tertiary)]">Default Background</span>
                      <span className="text-[17px] font-medium">{brand.avatar.background}</span>
                    </div>
                 </div>
              </div>
            </section>
          )}

          <section className="space-y-5">
            <h3 className="text-[22px] font-semibold tracking-tight px-2 flex items-center gap-2">
              <MessageSquare size={24} className="text-[var(--accent)]" /> Writing & Tone
            </h3>`;

content = content.replace(targetStr, insertStr);

fs.writeFileSync('src/components/BrandingEngine.tsx', content);
