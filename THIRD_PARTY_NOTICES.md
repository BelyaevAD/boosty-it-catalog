# Уведомления о сторонних компонентах

## Primer Octicons

Иконка `mark-github-24` в `site/assets/icons.svg` взята из
[Primer Octicons](https://github.com/primer/octicons).

MIT License

Copyright (c) 2026 GitHub Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

GitHub and the Invertocat are trademarks of GitHub, Inc. The mark is used only
as a secondary social link to this project's GitHub repository.

## Unofficial GitHub Buttons

The Star widget is loaded in a sandboxed iframe from
[ghbtns.com](https://ghbtns.com/), an open-source project by Mark Otto
distributed under the Apache License 2.0. Its code is not bundled with this
repository and does not execute in the parent page. To obtain the live count,
the iframe loads JSONP from `api.github.com`; both hosts receive ordinary
request metadata such as the visitor's IP address and User-Agent.

The iframe uses `referrerpolicy="no-referrer"`, a restrictive sandbox, and the
`credentialless` attribute where the browser supports it. Browsers without
`credentialless` support may ignore that additional isolation.
