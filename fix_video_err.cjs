const fs = require('fs');
let code = fs.readFileSync('src/components/VideoIdeas.tsx', 'utf8');

code = code.replace("  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);", "  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);\n  const [errorMsg, setErrorMsg] = useState('');");

code = code.replace("  const handleGenerateIdeas = async () => {\n    if (!user || !brand) return;\n    setIsGeneratingIdeas(true);", "  const handleGenerateIdeas = async () => {\n    if (!user || !brand) return;\n    setIsGeneratingIdeas(true);\n    setErrorMsg('');");

code = code.replace("    } catch (error) {\n      console.error(error);\n    } finally {", "    } catch (error: any) {\n      console.error(error);\n      setErrorMsg(error.message || 'An error occurred while generating ideas.');\n    } finally {");

const errHtml = `        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-[16px] text-[15px] font-medium flex items-start gap-3 mb-6 mx-auto max-w-sm w-full">
            <span className="shrink-0 mt-0.5">⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}
        
        <button
          onClick={handleGenerateIdeas}`;

code = code.replace("        <button\n          onClick={handleGenerateIdeas}", errHtml);

fs.writeFileSync('src/components/VideoIdeas.tsx', code);
