import { useState, useEffect } from 'react'
import { Copy, Check, Terminal, ChevronDown, ChevronUp } from 'lucide-react'

interface OTelExportConfigProps {
  httpPort?: number
  grpcPort?: number
  hasData?: boolean // If true, component starts collapsed
}

export function OTelExportConfig({ 
  httpPort = 4318, 
  grpcPort = 4317,
  hasData = false
}: OTelExportConfigProps) {
  const [copiedHttp, setCopiedHttp] = useState(false)
  const [copiedGrpc, setCopiedGrpc] = useState(false)
  const [isExpanded, setIsExpanded] = useState(!hasData) // Expanded when no data

  // Update expanded state when hasData changes
  useEffect(() => {
    setIsExpanded(!hasData)
  }, [hasData])

  const httpConfig = `export OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:${httpPort}"
export OTEL_TRACES_EXPORTER="otlp"
export OTEL_EXPORTER_OTLP_PROTOCOL="http/protobuf"`

  const grpcConfig = `export OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:${grpcPort}"
export OTEL_TRACES_EXPORTER="otlp"
export OTEL_EXPORTER_OTLP_PROTOCOL="grpc"`

  const copyToClipboard = async (text: string, type: 'http' | 'grpc') => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === 'http') {
        setCopiedHttp(true)
        setTimeout(() => setCopiedHttp(false), 2000)
      } else {
        setCopiedGrpc(true)
        setTimeout(() => setCopiedGrpc(false), 2000)
      }
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            OpenTelemetry Configuration
          </h2>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="px-6 pb-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-4 mt-4">
            Copy these environment variables to configure your application to send telemetry data to this viewer.
          </p>

      {/* HTTP Configuration */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700">For HTTP:</h3>
          <button
            onClick={() => copyToClipboard(httpConfig, 'http')}
            className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
          >
            {copiedHttp ? (
              <>
                <Check className="w-4 h-4 text-green-600" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </button>
        </div>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-md text-sm overflow-x-auto">
          {httpConfig}
        </pre>
      </div>

      {/* GRPC Configuration */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700">For GRPC:</h3>
          <button
            onClick={() => copyToClipboard(grpcConfig, 'grpc')}
            className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
          >
            {copiedGrpc ? (
              <>
                <Check className="w-4 h-4 text-green-600" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </button>
        </div>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-md text-sm overflow-x-auto">
          {grpcConfig}
        </pre>
      </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-md">
            <p className="text-xs text-blue-800">
              <strong>💡 Tip:</strong> After setting these variables, restart your application to start sending telemetry data.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

