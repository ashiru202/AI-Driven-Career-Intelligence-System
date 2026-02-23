import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";
import Layout from "../components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

export default function ResumeAnalyze() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(pdf|docx)$/i)) {
        setError('Please select a PDF or DOCX file');
        setFile(null);
        return;
      }
      
      // Validate file size (5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        setFile(null);
        return;
      }

      setFile(selectedFile);
      setError("");
    }
  };

  const submit = async () => {
    if (!file) {
      setError("Please select a resume file to upload");
      return;
    }

    const formData = new FormData();
    formData.append("resume", file);

    try {
      setLoading(true);
      setResult(null);
      setError("");

      const res = await api.post("/api/resumes/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.ok && res.data.data) {
        setResult(res.data.data);
      }
    } catch (e) {
      console.error("Resume analyze error:", e.response?.data || e);
      const errorMsg = e.response?.data?.error?.message || "Resume analysis failed";
      const errorCode = e.response?.data?.error?.code;
      
      if (errorCode === 'NLP_DOWN') {
        setError("NLP service is not responding. Please ensure it's running and try again.");
      } else {
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div>
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Resume Analyzer</h2>
            <p className="text-gray-600 mt-2">Upload your resume to extract and analyze your skills</p>
          </div>
          <Link 
            to="/my-resumes" 
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            View My Resumes
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload Resume</CardTitle>
            <CardDescription>
              Supported formats: PDF, DOCX (max 5MB)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <input
                type="file"
                accept=".pdf,.docx"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100
                  cursor-pointer"
              />
              {file && (
                <p className="mt-2 text-sm text-gray-600">
                  Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <Button 
              onClick={submit} 
              disabled={loading || !file}
              className="w-full"
            >
              {loading ? 'Analyzing...' : 'Analyze Resume'}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Analysis Results</CardTitle>
              <CardDescription>
                {result.skillCount} skills extracted from your resume
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Extracted Skills:</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.skills && result.skills.length > 0 ? (
                      result.skills.map((skill, idx) => (
                        <Badge key={idx} variant="default">
                          {skill}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-gray-500">No skills found</p>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    Resume ID: <span className="font-mono text-xs">{result.resumeId}</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
