# Export generated logo artwork at the sizes used by the app and store listing.
# Requires Windows PowerShell and System.Drawing; no network or runtime dependency.
param(
  [string]$Symbol = 'assets/brand/spino-symbol-master.png',
  [string]$Feature = 'assets/brand/spino-feature-master.png'
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot
Set-Location $projectRoot
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;

public static class SpinoArtwork {
    static readonly Color Ink = Color.FromArgb(20, 22, 26);
    static Rectangle Bounds(Bitmap image) {
        int left=image.Width, top=image.Height, right=-1, bottom=-1;
        for(int y=0;y<image.Height;y++) for(int x=0;x<image.Width;x++) {
            if(image.GetPixel(x,y).A < 16) continue;
            left=Math.Min(left,x); top=Math.Min(top,y); right=Math.Max(right,x); bottom=Math.Max(bottom,y);
        }
        if(right<0) throw new Exception("Logo artwork is empty.");
        if(image.GetPixel(0,0).A!=0 || image.GetPixel(image.Width-1,image.Height-1).A!=0)
            throw new Exception("The symbol master must have a genuinely transparent background.");
        return Rectangle.FromLTRB(left,top,right+1,bottom+1);
    }
    static void Quality(Graphics g) {
        g.InterpolationMode=InterpolationMode.HighQualityBicubic;
        g.SmoothingMode=SmoothingMode.AntiAlias;
        g.PixelOffsetMode=PixelOffsetMode.HighQuality;
        g.CompositingQuality=CompositingQuality.HighQuality;
    }
    static void Save(Bitmap image,string path) {
        Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(path)));
        image.Save(path,ImageFormat.Png);
    }
    public static void Symbol(string source,string path,int size,double fraction,bool background,bool round,bool mono) {
        using(var original=new Bitmap(source)) using(var output=new Bitmap(size,size,PixelFormat.Format32bppArgb)) using(var g=Graphics.FromImage(output)) {
            Quality(g); g.Clear(Color.Transparent);
            if(background) {
                using(var fill=new SolidBrush(Ink)) {
                    if(round) g.FillEllipse(fill,0,0,size,size); else g.Clear(Ink);
                }
            }
            var crop=Bounds(original); double scale=size*fraction/Math.Max(crop.Width,crop.Height);
            int width=(int)Math.Round(crop.Width*scale),height=(int)Math.Round(crop.Height*scale);
            var dest=new Rectangle((size-width)/2,(size-height)/2,width,height);
            using(var attributes=new ImageAttributes()) {
                attributes.SetWrapMode(WrapMode.TileFlipXY);
                if(mono) {
                    var matrix=new ColorMatrix(); matrix.Matrix00=matrix.Matrix11=matrix.Matrix22=0;
                    matrix.Matrix40=matrix.Matrix41=matrix.Matrix42=1; attributes.SetColorMatrix(matrix);
                }
                g.DrawImage(original,dest,crop.X,crop.Y,crop.Width,crop.Height,GraphicsUnit.Pixel,attributes);
            }
            Save(output,path);
        }
    }
    public static void Feature(string source,string path) {
        using(var original=new Bitmap(source)) using(var output=new Bitmap(1024,500,PixelFormat.Format24bppRgb)) using(var g=Graphics.FromImage(output)) {
            Quality(g); g.Clear(Ink);
            double scale=Math.Min(1024.0/original.Width,500.0/original.Height);
            int width=(int)Math.Round(original.Width*scale),height=(int)Math.Round(original.Height*scale);
            g.DrawImage(original,new Rectangle((1024-width)/2,(500-height)/2,width,height)); Save(output,path);
        }
    }
}
'@

[SpinoArtwork]::Symbol($Symbol, 'assets/brand/spino-icon-1024.png', 1024, .74, $true, $false, $false)
[SpinoArtwork]::Symbol($Symbol, 'assets/brand/play-store-icon-512.png', 512, .74, $true, $false, $false)
[SpinoArtwork]::Symbol($Symbol, 'assets/brand/spino-symbol-512.png', 512, .9, $false, $false, $false)
[SpinoArtwork]::Symbol($Symbol, 'public/brand/spino-mark-128.png', 128, .9, $false, $false, $false)
[SpinoArtwork]::Symbol($Symbol, 'public/brand/spino-icon-64.png', 64, .74, $true, $false, $false)
[SpinoArtwork]::Symbol($Symbol, 'public/brand/spino-icon-180.png', 180, .74, $true, $false, $false)

$densitySizes = @(
  @{ Density='mdpi'; Icon=48; Adaptive=108; Splash=128 },
  @{ Density='hdpi'; Icon=72; Adaptive=162; Splash=192 },
  @{ Density='xhdpi'; Icon=96; Adaptive=216; Splash=256 },
  @{ Density='xxhdpi'; Icon=144; Adaptive=324; Splash=384 },
  @{ Density='xxxhdpi'; Icon=192; Adaptive=432; Splash=512 }
)
foreach ($entry in $densitySizes) {
  $mipmap = "android/app/src/main/res/mipmap-$($entry.Density)"
  [SpinoArtwork]::Symbol($Symbol, "$mipmap/spino_launcher.png", $entry.Icon, .74, $true, $false, $false)
  [SpinoArtwork]::Symbol($Symbol, "$mipmap/spino_launcher_round.png", $entry.Icon, .68, $true, $true, $false)
  # 56 dp artwork inside the 108 dp canvas leaves room for Android's masks.
  [SpinoArtwork]::Symbol($Symbol, "$mipmap/spino_foreground.png", $entry.Adaptive, (56.0/108.0), $false, $false, $false)
  [SpinoArtwork]::Symbol($Symbol, "$mipmap/spino_monochrome.png", $entry.Adaptive, (56.0/108.0), $false, $false, $true)
  [SpinoArtwork]::Symbol($Symbol, "android/app/src/main/res/drawable-$($entry.Density)/spino_mark.png", $entry.Splash, .9, $false, $false, $false)
}
if (Test-Path -LiteralPath $Feature) {
  [SpinoArtwork]::Feature($Feature, 'assets/brand/play-store-feature-1024x500.png')
}
Write-Host 'Exported SPino artwork for Android, web and Google Play.'
