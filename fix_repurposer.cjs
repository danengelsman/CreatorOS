const fs = require('fs');
let code = fs.readFileSync('src/components/ContentRepurposer.tsx', 'utf8');

if (!code.includes('const [errorMsg, setErrorMsg] = useState(')) {
  code = code.replace("  const [isGenerating, setIsGenerating] = useState(false);", "  const [isGenerating, setIsGenerating] = useState(false);\n  const [errorMsg, setErrorMsg] = useState('');");
}

code = code.replace("  const handleGenerate = async () => {\n    if (!inputContent) return;\n    setIsGenerating(true);", "  const handleGenerate = async () => {\n    if (!inputContent) return;\n    setIsGenerating(true);\n    setErrorMsg('');");

code = code.replace("    } catch (err) {\n      console.error(err);\n    } finally {\n      setIsGenerating(false);", "    } catch (err: any) {\n      console.error(err);\n      setErrorMsg(err.message || 'Failed to repurpose content');\n    } finally {\n      setIsGenerating(false);");

const errHtml = `        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-[16px] text-[15px] font-medium flex items-start gap-3 mt-4">
            <span className="shrink-0 mt-0.5">⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}
        
        <button 
          onClick={handleGenerate}`;

code = code.replace("        <button \n          onClick={handleGenerate}", errHtml);

fs.writeFileSync('src/components/ContentRepurposer.tsx', code);
