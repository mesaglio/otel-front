class OtelViewer < Formula
  desc "Lightweight OpenTelemetry viewer for local development"
  homepage "https://github.com/mesaglio/otel-viewer"
  version "0.1.0"
  
  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/mesaglio/otel-viewer/releases/download/v#{version}/otel-viewer-darwin-arm64.tar.gz"
      sha256 "PLACEHOLDER_ARM64_SHA256" # Will be updated by release script
    else
      url "https://github.com/mesaglio/otel-viewer/releases/download/v#{version}/otel-viewer-darwin-amd64.tar.gz"
      sha256 "PLACEHOLDER_AMD64_SHA256" # Will be updated by release script
    end
  end

  on_linux do
    if Hardware::CPU.arm?
      url "https://github.com/mesaglio/otel-viewer/releases/download/v#{version}/otel-viewer-linux-arm64.tar.gz"
      sha256 "PLACEHOLDER_LINUX_ARM64_SHA256"
    else
      url "https://github.com/mesaglio/otel-viewer/releases/download/v#{version}/otel-viewer-linux-amd64.tar.gz"
      sha256 "PLACEHOLDER_LINUX_AMD64_SHA256"
    end
  end

  def install
    if OS.mac?
      if Hardware::CPU.arm?
        bin.install "otel-viewer-darwin-arm64" => "otel-viewer"
      else
        bin.install "otel-viewer-darwin-amd64" => "otel-viewer"
      end
    else
      if Hardware::CPU.arm?
        bin.install "otel-viewer-linux-arm64" => "otel-viewer"
      else
        bin.install "otel-viewer-linux-amd64" => "otel-viewer"
      end
    end
  end

  test do
    system "#{bin}/otel-viewer", "--help"
  end

  def caveats
    <<~EOS
      OTEL Viewer installed successfully!
      
      Start the viewer:
        $ otel-viewer
      
      Browser opens automatically at http://localhost:8000
      
      OTLP endpoints ready:
        HTTP: http://localhost:4318
        gRPC: localhost:4317
      
      Send test data:
        $ git clone https://github.com/mesaglio/otel-viewer
        $ cd otel-viewer
        $ go run scripts/send_otlp_data.go --count 20
      
      Documentation: https://github.com/mesaglio/otel-viewer
    EOS
  end
end

