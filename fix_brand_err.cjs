const fs = require('fs');
let code = fs.readFileSync('src/components/BrandingEngine.tsx', 'utf8');

code = code.replace("  const [isLoading, setIsLoading] = useState(false);", "  const [isLoading, setIsLoading] = useState(false);\n  const [errorMsg, setErrorMsg] = useState('');");

code = code.replace("  const handleGenerate = async () => {\n    if (!input || !user) return;\n    setIsLoading(true);", "  const handleGenerate = async () => {\n    if (!input || !user) return;\n    setIsLoading(true);\n    setErrorMsg('');");

code = code.replace("    } catch (error) {\n      console.error(error);\n    } finally {", "    } catch (error: any) {\n      console.error(error);\n      setErrorMsg(error.message || 'An error occurred while generating the brand kit.');\n    } finally {");

const errHtml = `        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-[16px] text-[15px] font-medium flex items-start gap-3 mt-4">
            <span className="shrink-0 mt-0.5">⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}
        
        <button 
          onClick={handleGenerate}`;

code = code.replace("        <button \n          onClick={handleGenerate}", errHtml);

fs.writeFileSync('src/components/BrandingEngine.tsx', code);
