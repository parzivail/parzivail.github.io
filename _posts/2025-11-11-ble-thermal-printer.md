---
layout: post
published: true
title: Documenting the X6h Mini BLE Thermal Printer
subtitle: Diving deeper into everyone's favorite class of imported thermal pocket printer
---

![A photo of the thermal printer printing a photo of the thermal printer printing...](/assets/images/ble-thermal-printer/header.jpg)

# Background

Recently I imported one of seemingly endless variants of the tiny "cat" thermal printers, mine actually lacking any feline theming. Depending on which variant you buy, you're prompted to install one of a few dodgy Android/iOS clone apps (like [iPrint](https://play.google.com/store/apps/details?id=com.frogtosea.iprint) or [Tiny Print](https://play.google.com/store/apps/details?id=com.frogtosea.tinyPrint)) to communicate with it over Bluetooth Low Energy.

Tinkering around in the app, the printer exposes a few interesting options that are hidden or missing in some of my more "professional" thermal printers, like setting the printhead energy, paper feed speed, and even 4-bit grayscale printing. Printing anything from my phone might be more convenient on the go, but for using it in the lab, desktop printing is a must.

There seem to be a number of scripts and sites that support these printers, like the very nice [Cat-Printer](https://github.com/NaitLee/Cat-Printer) Python library, and its web companion [kitty-printer](https://print.unseen-site.fun/), but I wasn't able to find one that exposes all the features of mine, or even prints with the same quality as the app.

# The App

I found copies of the two most popular Android app APKs, so into [JADX](https://github.com/skylot/jadx) they go! Both apps are superficially different, but they're identical at their BLE core. For those interested, a few interesting (and convoluted) classes contain most of the protocol:

- `com.lib.blueUtils.BluetoothOrder` has most of the hardcoded message definitions
- `com.lib.blueUtils.BluetoothUtils` deals with device-specific messages, like WiFi (if supported) and battery level statuses
- `com.lib.blueUtils.PrintDataUtils` implements the 1-bit and 4-bit grayscale image conversion and compression
- `com.Utils.PrinterModel` shows the various options available for each printer model supported by the app
- `com.Utils.PrintModelUtils` has all of the actual configurations available for each printer
  - see the [appendix](#appendix) for the list as a CSV

I spent a few hours poking around and trying to trace the logic for my particular printer model (`X6h`, apparently distinct from `X6H`), but came up mostly empty-handed. I turned instead to just sniffing the BLE packets and cross-referencing them, which was much quicker.

# Sniffing BLE

I used the [Adafruit Bluefruit LE Friend](https://www.adafruit.com/product/2269) BLE sniffer dongle, which is conveniently supported in Wireshark with a plugin from Nordic ([archive.org link](https://web.archive.org/web/20210918064417/https://www.nordicsemi.com/Products/Development-tools/nrf-sniffer-for-bluetooth-le/download#infotabs)). After the devices have connected, we can see commands written to the printer's characteristic:

![A wireshark screenshot of the BLE packets](/assets/images/ble-thermal-printer/wireshark.jpg)

A typical packet is shown as the write `Value`.

For my printer,

- Print service: `0000ae30-0000-1000-8000-00805f9b34fb`
- Print write characteristic: `0000ae01-0000-1000-8000-00805f9b34fb`
- Print read characteristic: `0000ae02-0000-1000-8000-00805f9b34fb`

# Packet Format

Cross-referencing the data with the information in the app, I gather that packets to and from this printer follow this format:

```
| 51 78 | A4 | 00 | 01 00 | 35 | 8B | FF |
  |       |    |    |       |    |    Always FF
  |       |    |    |       |    CRC8 checksum (payload only, 0x07 polynomial)
  |       |    |    |       Payload
  |       |    |    Payload length (LE U16)
  |       |    Message direction? (U8, 0: Host to Printer, 1: Printer to Host)
  |       Command ID (U8)
  Magic (LE U16, always 0x7851)
```

Most other printers use this same format, with some specific models prefixing the entire message with `0x12`. However, some packets use an invalid hardcoded checksum, more on that later.

## Commands

| Command ID | Name                              | Payload                                                   |
| ---------- | --------------------------------- | --------------------------------------------------------- |
| `0xA1`     | Feed Paper                        | LE U16, pixels of paper to feed                           |
| `0xBD`     | Set Feed Speed                    | U8, speed divisor (smaller is faster)                     |
| `0xBE`     | Print                             | U8, print type OR { U8, print type; U8, grayscale depth } |
| `0xA4`     | Quality                           | U8, quality                                               |
| `0xAF`     | Energy                            | LE U16, thermal printhead energy                          |
| `0xAE`     | Device Status                     | See below                                                 |
| `0xCF`     | Gray compressed scanline data     | See below                                                 |
| `0xCE`     | Binary compressed scanline data   | See below                                                 |
| `0xA2`     | Binary raw single scanline        | See below                                                 |
| `0xBF`     | Binary compressed single scanline | Unknown                                                   |
| `0xA6`     | Lattice                           | Unknown                                                   |
| `0xA8`     | Device Info                       | Unknown                                                   |
| `0xBB`     | Device ID                         | Unknown                                                   |
| `0xA3`     | Device State                      | Unknown                                                   |
| `0xA9`     | Update Device                     | Unknown                                                   |
| `0xBA`     | Battery Level                     | Unknown                                                   |

## Print

| Print type | App Mnemonic |
| ---------- | ------------ |
| `0x00`     | Image        |
| `0x01`     | Text         |
| `0x02`     | Tattoo       |
| `0x03`     | Label        |

| Print bit depth | Value    |
| --------------- | -------- |
| `0x00`          | "Gray8"  |
| `0x01`          | "Gray16" |

The print command requires a hardcoded CRC: (Text, Gray 8) requires a CRC of `0x15`, and (Text, Gray 16) requires `0x12`, even though that is not their valid CRC.

## Quality

| Print type | App Mnemonic      |
| ---------- | ----------------- |
| `0x31`     | Quality 1 (worst) |
| `0x32`     | Quality 2         |
| `0x33`     | Quality 3         |
| `0x34`     | Quality 4         |
| `0x35`     | Quality 5 (best)  |

Some printers instead use this mapping:

| Print type | App Mnemonic               |
| ---------- | -------------------------- |
| `0x1`      | "Deepen Concentration"     |
| `0x3`      | "Moderation Concentration" |
| `0x5`      | "Thin Concentration"       |

## Device Status

When receiving, a payload of `0x10` indicates the RX buffer is full, and to stop sending data (`5178AE0101001070FF`). Conversely, the payload `0x00` indicates that data can be sent again (`5178AE0101000000FF`).

## Compressed scanline data

When printing in binary or 4-bit grayscale modes, the printer supports receiving the image data as a series of bitmap scanlines compressed with LZO. The app uses the `MiniLZO` library for compression.

```
| EF BE | 34 12 | FF ...
  |       |       Compressed bitmap data
  |       Compressed bitmap size (LE U16)
  Uncompressed bitmap size (LE U16)
```

For 1bpp images, the leftmost pixel is the least-significant bit, and the 8th column of pixels is the most significant bit. For 4bpp images, the lower nibble is the leftmost column, and the upper nibble is the rightmost. Each scanline is compressed and sent separately for my printer as 48- and 192-byte scanlines, respectively, for my 384-column printhead. The printer seems to expect the first row to be completely zeroes (i.e. white) or else printing artifacts are introduced.

Printers with the "newCompress" flag set instead require zlib compression, which I haven't tested.

## Raw scanlines

For 1bpp images, the scanlines can be buffered directly without compression, using the same format as the compressed payload, albeit without compression applied and without the compression header (i.e. a raw 48-byte payload). Looking around online, some printers may require a Start Lattice (`5178A6000B00AA551738445F5F5F44382CA1FF`) and End Lattice (`5178A6000B00AA5517000000000000001711FF`) command surrounding this data, but mine apparently does not.

# Results

Here are two copies of the same gradient and two bitmaps printed with a C# command-line app using the information gathered here, annotated in blue. I did not gamma-correct the 4bpp prints, which is a process that depends on the print speed, thermal head energy, paper characteristics, etc. and is generally too fiddly to worry about.

Looks great!

(1200 DPI scan, scaled to ~30%)

![A scanned image of two gradients and two bitmaps printed on thermal paper](/assets/images/ble-thermal-printer/samples.jpg)

# Hardware

![A mosaic image of the front of the motherboard with the printhead, without it, and of the reverse](/assets/images/ble-thermal-printer/motherboard.jpg)

- <span class="color-pip" style="background-color: #F00" /> Zhuhai Jieli AC6956C microcontroller ([datasheet](https://www.yunthinker.net/wp-content/uploads/2024/08/AC6956C-Datasheet-V1.1.pdf), [archive.org backup](https://web.archive.org/web/20251111160428/https://www.yunthinker.net/wp-content/uploads/2024/08/AC6956C-Datasheet-V1.1.pdf))
- <span class="color-pip" style="background-color: #EF0" /> 4056-style Li-Ion battery charge controller
- <span class="color-pip" style="background-color: #0CF" /> 8833-style dual H-bridge as a stepper driver (Sytatek SA8833)
- <span class="color-pip" style="background-color: #F0F" /> Seiko LTP02-245-13 thermal printhead clone ([datasheet](https://download.mikroe.com/documents/datasheets/LTP02-245-13_datasheet.pdf), [archive.org backup](https://web.archive.org/web/20250218123545/https://download.mikroe.com/documents/datasheets/LTP02-245-13_datasheet.pdf))

# Appendix

- [List of printers and their parameters](https://gist.github.com/parzivail/6590b233e1f3eec4f7a889919d5189b8) according to Tiny Print 1.3.62
