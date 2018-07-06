/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as ts from 'typescript';
import { NgccReflectionHost } from '../host/ngcc_host';
import { ParsedClass} from './parsed_class';
import { ParsedFile } from './parsed_file';
import { FileParser } from './parser';

export class Esm2015PackageParser implements FileParser {

  checker = this.program.getTypeChecker();

  constructor(
    protected program: ts.Program,
    protected host: NgccReflectionHost) {}

  parseFile(entryPoint: ts.SourceFile): ParsedFile[] {
    const moduleSymbol = this.checker.getSymbolAtLocation(entryPoint);
    const map = new Map<ts.SourceFile, ParsedFile>();
    if (moduleSymbol) {

      const exportClasses = this.checker.getExportsOfModule(moduleSymbol)
        .map(exportSymbol => ts.SymbolFlags.Alias & exportSymbol.flags ? this.checker.getAliasedSymbol(exportSymbol) : exportSymbol)
        .filter(exportSymbol => exportSymbol.flags & ts.SymbolFlags.Class);

      const classDeclarations = exportClasses
        .map(exportSymbol => exportSymbol.valueDeclaration as ts.ClassDeclaration);


      const decoratedClasses = classDeclarations
        .map(declaration => {
          const decorators = this.host.getDecoratorsOfDeclaration(declaration);
          if (decorators) {
            return new ParsedClass(declaration.name!.text, declaration, decorators);
          }
        })
        .filter(decoratedClass => decoratedClass) as ParsedClass[];

      decoratedClasses.forEach(clazz => {
        const file = clazz.declaration.getSourceFile();
        if (!map.has(file)) {
          map.set(file, new ParsedFile(file));
        }
        map.get(file)!.decoratedClasses.push(clazz);
      });
    }
    return Array.from(map.values());
  }
}