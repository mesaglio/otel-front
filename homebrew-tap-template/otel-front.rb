# This formula is automatically updated by GoReleaser
# DO NOT EDIT MANUALLY

class OtelFront < Formula
  desc "Lightweight OpenTelemetry viewer for local development"
  homepage "https://github.com/mesaglio/otel-front"
  version "0.1.0"
  license "MIT"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/mesaglio/otel-front/releases/download/v0.1.0/otel-front_0.1.0_Darwin_arm64.tar.gz"
      sha256 "PLACEHOLDER_ARM64_SHA256"
    elsif Hardware::CPU.intel?
      url "https://github.com/mesaglio/otel-front/releases/download/v0.1.0/otel-front_0.1.0_Darwin_x86_64.tar.gz"
      sha256 "PLACEHOLDER_AMD64_SHA256"
    end
  end

  on_linux do
    if Hardware::CPU.arm?
      url "https://github.com/mesaglio/otel-front/releases/download/v0.1.0/otel-front_0.1.0_Linux_arm64.tar.gz"
      sha256 "PLACEHOLDER_LINUX_ARM64_SHA256"
    elsif Hardware::CPU.intel?
      url "https://github.com/mesaglio/otel-front/releases/download/v0.1.0/otel-front_0.1.0_Linux_x86_64.tar.gz"
      sha256 "PLACEHOLDER_LINUX_AMD64_SHA256"
    end
  end

  def install
    bin.install "otel-front"
  end

  def caveats
    <<~EOS
      OTEL Front has been installed!

      To start the viewer:
        otel-front

      The web UI will open at http://localhost:8000

      OTLP endpoints:
        - HTTP: http://localhost:4318
        - gRPC: localhost:4317

      For more information:
        https://github.com/mesaglio/otel-front
    EOS
  end

  test do
    system "#{bin}/otel-front", "--version"
  end
end
